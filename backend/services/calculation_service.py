from decimal import Decimal
from typing import Dict, List, Optional
from backend.models import (
    Material,
    ManoObra,
    Equipo,
    Maquinaria,
    Concepto,
    MatrizInsumo,
    ConstantesFASAR,
    Proyecto
)
from backend.extensions import db

def decimal_field(value) -> Decimal:
    if value is None:
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    if isinstance(value, str) and not value.strip():
        return Decimal("0")
    return Decimal(str(value))

def calcular_fasar_valor() -> Decimal:
    constantes = ConstantesFASAR.get_singleton()
    dias_pagados = (
        Decimal(constantes.dias_del_anio)
        + Decimal(constantes.dias_aguinaldo_minimos)
        + Decimal(constantes.dias_vacaciones_minimos) * Decimal(constantes.prima_vacacional_porcentaje)
    )
    dias_trabajados = (
        Decimal(constantes.dias_del_anio)
        - Decimal(constantes.dias_festivos_obligatorios)
        - Decimal(constantes.dias_vacaciones_minimos)
        - Decimal(constantes.dias_riesgo_trabajo_promedio)
    )
    if dias_trabajados <= 0:
        return Decimal("1.0")
    factor_dias = dias_pagados / dias_trabajados
    factor_cargas = Decimal("1.0") + Decimal(constantes.suma_cargas_sociales)
    return factor_dias * factor_cargas


def calcular_costo_posesion(maquinaria: Maquinaria) -> Decimal:
    costo = decimal_field(maquinaria.costo_adquisicion)
    vida = decimal_field(maquinaria.vida_util_horas or Decimal("1.0"))
    if vida <= 0:
        vida = Decimal("1.0")
    tasa = decimal_field(maquinaria.tasa_interes_anual or Decimal("0.0"))
    depreciacion = costo / vida
    interes = (costo * tasa) / vida
    return depreciacion + interes


def obtener_costo_insumo(
    registro: Dict,
    material_cache: Dict[int, Material],
    mano_obra_cache: Dict[int, ManoObra],
    equipo_cache: Dict[int, Equipo],
    maquinaria_cache: Dict[int, Maquinaria],
) -> Decimal:
    tipo = registro["tipo_insumo"]
    insumo_id = registro["id_insumo"]
    precio_custom = decimal_field(registro.get("precio_custom")) if registro.get("precio_custom") is not None else None

    if tipo == "Material":
        material = material_cache.get(insumo_id)
        if material is None and insumo_id:
            material = Material.query.get(insumo_id)
            if material:
                material_cache[insumo_id] = material

        # Determine base values from catalog or custom
        base_precio = decimal_field(material.precio_unitario) if material else (precio_custom if precio_custom is not None else Decimal("0"))
        base_merma = decimal_field(material.porcentaje_merma) if material else Decimal("0.03") # Default 3% if custom
        base_flete = decimal_field(material.precio_flete_unitario) if material else Decimal("0")

        merma = (
            decimal_field(registro.get("porcentaje_merma"))
            if registro.get("porcentaje_merma") is not None
            else base_merma
        )
        flete = (
            decimal_field(registro.get("precio_flete_unitario"))
            if registro.get("precio_flete_unitario") is not None
            else base_flete
        )

        return base_precio * (Decimal("1.0") + merma) + flete

    if tipo == "ManoObra":
        mano = mano_obra_cache.get(insumo_id)
        if mano is None and insumo_id:
            mano = ManoObra.query.get(insumo_id)
            if mano:
                mano_obra_cache[insumo_id] = mano

        # If custom price, assume it's already integrated or base, let's treat as base * fasar=1 for simplicity
        # Or better: treat custom price as the final cost per unit (salario real) if no fasar info available

        if mano:
            rendimiento_base = decimal_field(mano.rendimiento_jornada or Decimal("1.0"))
            salario_real = decimal_field(mano.salario_base) * decimal_field(mano.fasar)
        else:
            rendimiento_base = Decimal("1.0")
            salario_real = precio_custom if precio_custom is not None else Decimal("0")

        rendimiento = (
            decimal_field(registro.get("rendimiento_jornada"))
            if registro.get("rendimiento_jornada") is not None
            else rendimiento_base
        )

        if rendimiento <= 0:
            rendimiento = Decimal("1.0")

        return salario_real / rendimiento

    if tipo == "Equipo":
        equipo = equipo_cache.get(insumo_id)
        if equipo is None and insumo_id:
            equipo = Equipo.query.get(insumo_id)
            if equipo:
                equipo_cache[insumo_id] = equipo

        if equipo:
            return decimal_field(equipo.costo_hora_maq)
        return precio_custom if precio_custom is not None else Decimal("0")

    if tipo == "Maquinaria":
        maquina = maquinaria_cache.get(insumo_id)
        if maquina is None and insumo_id:
            maquina = Maquinaria.query.get(insumo_id)
            if maquina:
                maquinaria_cache[insumo_id] = maquina

        if maquina:
            rendimiento = decimal_field(maquina.rendimiento_horario or Decimal("1.0"))
            if rendimiento <= 0:
                rendimiento = Decimal("1.0")
            costo_hora = decimal_field(maquina.costo_posesion_hora)
            return costo_hora / rendimiento

        # Custom logic for Maquinaria
        # Assume custom price is cost per hour directly
        return precio_custom if precio_custom is not None else Decimal("0")

    # Unknown type
    return Decimal("0")


def obtener_factor_decimal(factores: Dict[str, Dict[str, Decimal]], clave: str) -> Decimal:
    config = factores.get(clave) or {}
    activo = config.get("activo")
    if not activo:
        return Decimal("0.0")
    porcentaje = config.get("porcentaje", Decimal("0.0"))
    return Decimal(porcentaje)


def calcular_precio_unitario(
    concepto_id: Optional[int] = None,
    matriz: Optional[List[Dict]] = None,
    factores: Optional[Dict[str, Dict[str, Decimal]]] = None,
) -> Dict[str, float]:
    registros: List[Dict]
    if matriz is not None:
        registros = matriz
    elif concepto_id:
        registros = [insumo.to_dict() for insumo in MatrizInsumo.query.filter_by(concepto_id=concepto_id)]
    else:
        registros = []

    cd_base = Decimal("0")
    costo_mano_obra = Decimal("0")
    material_cache: Dict[int, Material] = {}
    mano_obra_cache: Dict[int, ManoObra] = {}
    equipo_cache: Dict[int, Equipo] = {}
    maquinaria_cache: Dict[int, Maquinaria] = {}

    for registro in registros:
        cantidad = decimal_field(registro["cantidad"])
        costo_unitario = obtener_costo_insumo(
            registro,
            material_cache,
            mano_obra_cache,
            equipo_cache,
            maquinaria_cache,
        )
        importe = cantidad * costo_unitario
        cd_base += importe
        if registro["tipo_insumo"] == "ManoObra":
            costo_mano_obra += importe

    factores = factores or {}
    factor_mano_obra = obtener_factor_decimal(factores, "mano_obra")
    ajuste_mano_obra = costo_mano_obra * factor_mano_obra
    cd_total = cd_base + ajuste_mano_obra
    multiplicador = Decimal("1.0")
    for key in ("indirectos", "financiamiento", "utilidad", "iva"):
        valor = obtener_factor_decimal(factores, key)
        multiplicador *= Decimal("1.0") + valor
    pu = cd_total * multiplicador
    return {
        "costo_directo": float(cd_total),
        "precio_unitario": float(pu),
    }

def normalizar_factores(payload: Optional[Dict]) -> Dict[str, Dict[str, Decimal]]:
    if not payload:
        return {}
    factores: Dict[str, Dict[str, Decimal]] = {}
    for clave in ("mano_obra", "indirectos", "financiamiento", "utilidad", "iva"):
        datos = payload.get(clave) or {}
        factores[clave] = {
            "activo": bool(datos.get("activo")),
            "porcentaje": decimal_field(datos.get("porcentaje")),
        }
    return factores

def obtener_factores_de_proyecto(proyecto: Proyecto) -> Dict[str, Dict[str, Decimal]]:
    return {
        "mano_obra": {
            "activo": bool(proyecto.ajuste_mano_obra_activo),
            "porcentaje": decimal_field(proyecto.ajuste_mano_obra_porcentaje),
        },
        "indirectos": {
            "activo": bool(proyecto.ajuste_indirectos_activo),
            "porcentaje": decimal_field(proyecto.ajuste_indirectos_porcentaje),
        },
        "financiamiento": {
            "activo": bool(proyecto.ajuste_financiamiento_activo),
            "porcentaje": decimal_field(proyecto.ajuste_financiamiento_porcentaje),
        },
        "utilidad": {
            "activo": bool(proyecto.ajuste_utilidad_activo),
            "porcentaje": decimal_field(proyecto.ajuste_utilidad_porcentaje),
        },
        "iva": {
            "activo": bool(proyecto.ajuste_iva_activo),
            "porcentaje": decimal_field(proyecto.ajuste_iva_porcentaje),
        },
    }

def aplicar_configuracion_proyecto(proyecto: Proyecto, payload: Dict) -> None:
    ajustes = payload.get("ajustes")
    if ajustes:
        ajustes_n = normalizar_factores(ajustes)
        proyecto.ajuste_mano_obra_activo = ajustes_n["mano_obra"]["activo"]
        proyecto.ajuste_mano_obra_porcentaje = ajustes_n["mano_obra"]["porcentaje"]
        proyecto.ajuste_indirectos_activo = ajustes_n["indirectos"]["activo"]
        proyecto.ajuste_indirectos_porcentaje = ajustes_n["indirectos"]["porcentaje"]
        proyecto.ajuste_financiamiento_activo = ajustes_n["financiamiento"]["activo"]
        proyecto.ajuste_financiamiento_porcentaje = ajustes_n["financiamiento"]["porcentaje"]
        proyecto.ajuste_utilidad_activo = ajustes_n["utilidad"]["activo"]
        proyecto.ajuste_utilidad_porcentaje = ajustes_n["utilidad"]["porcentaje"]
        proyecto.ajuste_iva_activo = ajustes_n["iva"]["activo"]
        proyecto.ajuste_iva_porcentaje = ajustes_n["iva"]["porcentaje"]

    proyecto.has_presupuesto_maximo = bool(payload.get("has_presupuesto_maximo"))
    proyecto.monto_maximo = decimal_field(payload.get("monto_maximo"))
