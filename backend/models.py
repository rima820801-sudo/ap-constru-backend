from datetime import date
from decimal import Decimal
from typing import Dict, Optional, List
from .extensions import db
from werkzeug.security import generate_password_hash, check_password_hash
import os

# Helper for date checks (will be used in to_dict)
PRECIOS_OBSOLETOS_DIAS = int(os.environ.get("PRECIOS_OBSOLETOS_DIAS", "90"))

def is_precio_obsoleto(fecha_actualizacion: Optional[date]) -> bool:
    """Determina si un precio está obsoleto según PRECIOS_OBSOLETOS_DIAS."""
    if not fecha_actualizacion:
        return False
    try:
        delta = date.today() - fecha_actualizacion
        return delta.days > PRECIOS_OBSOLETOS_DIAS
    except Exception:
        return False

def decimal_field(value) -> Decimal:
    if value is None:
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    if isinstance(value, str) and not value.strip():
        return Decimal("0")
    return Decimal(str(value))

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "is_admin": self.is_admin,
        }


class ConstantesFASAR(db.Model):
    __tablename__ = "constantes_fasar"

    id = db.Column(db.Integer, primary_key=True, default=1)
    dias_del_anio = db.Column(db.Integer, default=365)
    dias_festivos_obligatorios = db.Column(db.Numeric(6, 2), default=Decimal("7.0"))
    dias_riesgo_trabajo_promedio = db.Column(db.Numeric(6, 2), default=Decimal("1.5"))
    dias_vacaciones_minimos = db.Column(db.Integer, default=12)
    prima_vacacional_porcentaje = db.Column(db.Numeric(4, 2), default=Decimal("0.25"))
    dias_aguinaldo_minimos = db.Column(db.Integer, default=15)
    suma_cargas_sociales = db.Column(db.Numeric(5, 4), default=Decimal("0.15"))

    @classmethod
    def get_singleton(cls) -> "ConstantesFASAR":
        instancia = cls.query.get(1)
        if not instancia:
            instancia = cls(id=1)
            db.session.add(instancia)
            db.session.commit()
        return instancia

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "dias_del_anio": self.dias_del_anio,
            "dias_festivos_obligatorios": float(self.dias_festivos_obligatorios),
            "dias_riesgo_trabajo_promedio": float(self.dias_riesgo_trabajo_promedio),
            "dias_vacaciones_minimos": self.dias_vacaciones_minimos,
            "prima_vacacional_porcentaje": float(self.prima_vacacional_porcentaje),
            "dias_aguinaldo_minimos": self.dias_aguinaldo_minimos,
            "suma_cargas_sociales": float(self.suma_cargas_sociales),
        }


class Material(db.Model):
    __tablename__ = "materiales"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(255), unique=True, nullable=False)
    unidad = db.Column(db.String(50), nullable=False)
    precio_unitario = db.Column(db.Numeric(12, 4), nullable=False)
    fecha_actualizacion = db.Column(db.Date, default=date.today, nullable=False)
    disciplina = db.Column(db.String(100), nullable=True)
    calidad = db.Column(db.String(100), nullable=True)
    porcentaje_merma = db.Column(db.Numeric(5, 4), default=Decimal("0.03"), nullable=False)
    precio_flete_unitario = db.Column(db.Numeric(12, 4), default=Decimal("0.00"), nullable=False)

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "nombre": self.nombre,
            "unidad": self.unidad,
            "precio_unitario": float(self.precio_unitario),
            "fecha_actualizacion": self.fecha_actualizacion.isoformat(),
            "disciplina": self.disciplina,
            "calidad": self.calidad,
            "obsoleto": is_precio_obsoleto(self.fecha_actualizacion),
            "porcentaje_merma": float(self.porcentaje_merma or 0),
            "precio_flete_unitario": float(self.precio_flete_unitario or 0),
        }


class Equipo(db.Model):
    __tablename__ = "equipos"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(255), nullable=False)
    unidad = db.Column(db.String(50), nullable=False)
    disciplina = db.Column(db.String(100), nullable=True)
    calidad = db.Column(db.String(100), nullable=True)
    fecha_actualizacion = db.Column(db.Date, default=date.today, nullable=False)
    costo_hora_maq = db.Column(db.Numeric(12, 4), nullable=False)

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "nombre": self.nombre,
            "unidad": self.unidad,
            "disciplina": self.disciplina,
            "calidad": self.calidad,
            "fecha_actualizacion": self.fecha_actualizacion.isoformat(),
            "obsoleto": is_precio_obsoleto(self.fecha_actualizacion),
            "costo_hora_maq": float(self.costo_hora_maq),
        }


class Maquinaria(db.Model):
    __tablename__ = "maquinaria"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(255), nullable=False)
    costo_adquisicion = db.Column(db.Numeric(14, 2), nullable=False)
    vida_util_horas = db.Column(db.Numeric(14, 2), nullable=False)
    tasa_interes_anual = db.Column(db.Numeric(5, 4), default=Decimal("0.10"), nullable=False)
    rendimiento_horario = db.Column(db.Numeric(10, 4), default=Decimal("1.0"), nullable=False)
    costo_posesion_hora = db.Column(db.Numeric(14, 4), default=Decimal("0.0000"), nullable=False)
    disciplina = db.Column(db.String(100), nullable=True)
    calidad = db.Column(db.String(100), nullable=True)
    fecha_actualizacion = db.Column(db.Date, default=date.today, nullable=False)

    def actualizar_costo_posesion(self):
        # Implement logic inline to avoid circular import issues with services
        costo = decimal_field(self.costo_adquisicion)
        vida = decimal_field(self.vida_util_horas or Decimal("1.0"))
        if vida <= 0:
            vida = Decimal("1.0")
        tasa = decimal_field(self.tasa_interes_anual or Decimal("0.0"))
        depreciacion = costo / vida
        interes = (costo * tasa) / vida
        self.costo_posesion_hora = depreciacion + interes

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "nombre": self.nombre,
            "disciplina": self.disciplina,
            "calidad": self.calidad,
            "fecha_actualizacion": self.fecha_actualizacion.isoformat(),
            "obsoleto": is_precio_obsoleto(self.fecha_actualizacion),
            "costo_adquisicion": float(self.costo_adquisicion),
            "vida_util_horas": float(self.vida_util_horas),
            "tasa_interes_anual": float(self.tasa_interes_anual or 0),
            "rendimiento_horario": float(self.rendimiento_horario or 0),
            "costo_posesion_hora": float(self.costo_posesion_hora or 0),
        }


class ManoObra(db.Model):
    __tablename__ = "mano_obra"

    id = db.Column(db.Integer, primary_key=True)
    puesto = db.Column(db.String(255), nullable=False)
    salario_base = db.Column(db.Numeric(12, 2), nullable=False)
    antiguedad_anios = db.Column(db.Integer, default=1, nullable=False)
    fasar = db.Column(db.Numeric(12, 4), default=Decimal("1.0000"), nullable=False)
    rendimiento_jornada = db.Column(db.Numeric(10, 4), default=Decimal("1.0000"), nullable=False)
    disciplina = db.Column(db.String(100), nullable=True)
    calidad = db.Column(db.String(100), nullable=True)
    fecha_actualizacion = db.Column(db.Date, default=date.today, nullable=False)

    def refresh_fasar(self):
        # Inline logic to break dependency cycle
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
        factor_dias = dias_pagados / dias_trabajados if dias_trabajados > 0 else Decimal("1.0")
        factor_cargas = Decimal("1.0") + Decimal(constantes.suma_cargas_sociales)
        self.fasar = factor_dias * factor_cargas

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "puesto": self.puesto,
            "salario_base": float(self.salario_base),
            "antiguedad_anios": self.antiguedad_anios,
            "fasar": float(self.fasar),
            "rendimiento_jornada": float(self.rendimiento_jornada or 0),
            "disciplina": self.disciplina,
            "calidad": self.calidad,
            "fecha_actualizacion": self.fecha_actualizacion.isoformat(),
            "obsoleto": is_precio_obsoleto(self.fecha_actualizacion),
        }


class Concepto(db.Model):
    __tablename__ = "conceptos"

    id = db.Column(db.Integer, primary_key=True)
    clave = db.Column(db.String(50), unique=True, nullable=False)
    descripcion = db.Column(db.Text, nullable=False)
    unidad_concepto = db.Column(db.String(50), nullable=False)

    insumos = db.relationship("MatrizInsumo", backref="concepto", cascade="all, delete-orphan")

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "clave": self.clave,
            "descripcion": self.descripcion,
            "unidad_concepto": self.unidad_concepto,
        }


class MatrizInsumo(db.Model):
    __tablename__ = "matriz_insumo"

    id = db.Column(db.Integer, primary_key=True)
    concepto_id = db.Column(db.Integer, db.ForeignKey("conceptos.id"), nullable=False)
    tipo_insumo = db.Column(db.String(20), nullable=False)
    id_insumo = db.Column(db.Integer, nullable=False)
    cantidad = db.Column(db.Numeric(12, 4), nullable=False)
    porcentaje_merma = db.Column(db.Numeric(6, 4), nullable=True)
    precio_flete_unitario = db.Column(db.Numeric(12, 4), nullable=True)
    precio_custom = db.Column(db.Numeric(14, 4), nullable=True)

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "concepto": self.concepto_id,
            "tipo_insumo": self.tipo_insumo,
            "id_insumo": self.id_insumo,
            "cantidad": float(self.cantidad),
            "porcentaje_merma": float(self.porcentaje_merma) if self.porcentaje_merma is not None else None,
            "precio_flete_unitario": float(self.precio_flete_unitario) if self.precio_flete_unitario is not None else None,
            "precio_custom": float(self.precio_custom) if self.precio_custom is not None else None,
        }


class Proyecto(db.Model):
    __tablename__ = "proyectos"

    id = db.Column(db.Integer, primary_key=True)
    nombre_proyecto = db.Column(db.String(255), nullable=False)
    ubicacion = db.Column(db.String(255), nullable=True, default="")
    descripcion = db.Column(db.Text, nullable=True, default="")
    fecha_creacion = db.Column(db.Date, default=date.today, nullable=False)
    ajuste_mano_obra_activo = db.Column(db.Boolean, default=False)
    ajuste_mano_obra_porcentaje = db.Column(db.Numeric(6, 4), default=Decimal("0.00"))
    ajuste_indirectos_activo = db.Column(db.Boolean, default=False)
    ajuste_indirectos_porcentaje = db.Column(db.Numeric(6, 4), default=Decimal("0.00"))
    ajuste_financiamiento_activo = db.Column(db.Boolean, default=False)
    ajuste_financiamiento_porcentaje = db.Column(db.Numeric(6, 4), default=Decimal("0.00"))
    ajuste_utilidad_activo = db.Column(db.Boolean, default=False)
    ajuste_utilidad_porcentaje = db.Column(db.Numeric(6, 4), default=Decimal("0.00"))
    ajuste_iva_activo = db.Column(db.Boolean, default=False)
    ajuste_iva_porcentaje = db.Column(db.Numeric(6, 4), default=Decimal("0.00"))
    has_presupuesto_maximo = db.Column(db.Boolean, default=False)
    monto_maximo = db.Column(db.Numeric(14, 2), default=Decimal("0.00"))

    partidas = db.relationship("Partida", backref="proyecto", cascade="all, delete-orphan")

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "nombre_proyecto": self.nombre_proyecto,
            "ubicacion": self.ubicacion,
             "descripcion": self.descripcion or "",
            "fecha_creacion": self.fecha_creacion.isoformat(),
             "ajustes": {
                 "mano_obra": {
                     "activo": bool(self.ajuste_mano_obra_activo),
                     "porcentaje": float(self.ajuste_mano_obra_porcentaje or 0),
                 },
                 "indirectos": {
                     "activo": bool(self.ajuste_indirectos_activo),
                     "porcentaje": float(self.ajuste_indirectos_porcentaje or 0),
                 },
                 "financiamiento": {
                     "activo": bool(self.ajuste_financiamiento_activo),
                     "porcentaje": float(self.ajuste_financiamiento_porcentaje or 0),
                 },
                 "utilidad": {
                     "activo": bool(self.ajuste_utilidad_activo),
                     "porcentaje": float(self.ajuste_utilidad_porcentaje or 0),
                 },
                 "iva": {
                     "activo": bool(self.ajuste_iva_activo),
                     "porcentaje": float(self.ajuste_iva_porcentaje or 0),
                 },
             },
             "has_presupuesto_maximo": bool(self.has_presupuesto_maximo),
             "monto_maximo": float(self.monto_maximo or 0),
        }


class Partida(db.Model):
    __tablename__ = "partidas"

    id = db.Column(db.Integer, primary_key=True)
    proyecto_id = db.Column(db.Integer, db.ForeignKey("proyectos.id"), nullable=False)
    nombre_partida = db.Column(db.String(255), nullable=False)

    detalles = db.relationship("DetallePresupuesto", backref="partida", cascade="all, delete-orphan")

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "proyecto": self.proyecto_id,
            "nombre_partida": self.nombre_partida,
        }


class DetallePresupuesto(db.Model):
    __tablename__ = "detalle_presupuesto"

    id = db.Column(db.Integer, primary_key=True)
    partida_id = db.Column(db.Integer, db.ForeignKey("partidas.id"), nullable=False)
    concepto_id = db.Column(db.Integer, db.ForeignKey("conceptos.id"), nullable=False)
    cantidad_obra = db.Column(db.Numeric(14, 4), nullable=False)
    precio_unitario_calculado = db.Column(db.Numeric(14, 4), nullable=False)
    costo_directo = db.Column(db.Numeric(14, 4), nullable=False, default=Decimal("0.0000"))

    concepto = db.relationship("Concepto")

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "partida": self.partida_id,
            "concepto": self.concepto_id,
            "cantidad_obra": float(self.cantidad_obra),
            "precio_unitario_calculado": float(self.precio_unitario_calculado),
            "costo_directo": float(self.costo_directo or 0),
            "concepto_detalle": {
                "clave": self.concepto.clave,
                "descripcion": self.concepto.descripcion,
            },
        }
