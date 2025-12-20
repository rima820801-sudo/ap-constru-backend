from flask import Blueprint, request, jsonify
from datetime import date
from decimal import Decimal
from backend.models import Material, Equipo, Maquinaria, ManoObra
from backend.extensions import db
from backend.services.calculation_service import decimal_field

bp = Blueprint('catalogos', __name__, url_prefix='/api')

# --- Materiales ---
@bp.route("/materiales", methods=["GET", "POST"])
def materiales_collection():
    if request.method == "GET":
        materiales = Material.query.order_by(Material.nombre).all()
        return jsonify([mat.to_dict() for mat in materiales])

    payload = request.get_json(force=True)
    material = Material(
        nombre=payload["nombre"],
        unidad=payload["unidad"],
        precio_unitario=decimal_field(payload["precio_unitario"]),
        fecha_actualizacion=date.fromisoformat(payload.get("fecha_actualizacion")) if payload.get("fecha_actualizacion") else date.today(),
        porcentaje_merma=decimal_field(payload.get("porcentaje_merma", Decimal("0.03"))),
        precio_flete_unitario=decimal_field(payload.get("precio_flete_unitario", Decimal("0.00"))),
        disciplina=payload.get("disciplina"),
        calidad=payload.get("calidad"),
    )
    db.session.add(material)
    db.session.commit()
    return jsonify(material.to_dict()), 201

@bp.route("/materiales/<int:material_id>", methods=["GET", "PUT", "DELETE"])
def material_detail(material_id: int):
    material = Material.query.get_or_404(material_id)
    if request.method == "GET":
        return jsonify(material.to_dict())

    if request.method == "DELETE":
        db.session.delete(material)
        db.session.commit()
        return "", 204

    payload = request.get_json(force=True)
    material.nombre = payload.get("nombre", material.nombre)
    material.unidad = payload.get("unidad", material.unidad)
    if "precio_unitario" in payload:
        material.precio_unitario = decimal_field(payload["precio_unitario"])
    if "fecha_actualizacion" in payload:
        material.fecha_actualizacion = date.fromisoformat(payload["fecha_actualizacion"])
    if "disciplina" in payload:
        material.disciplina = payload.get("disciplina")
    if "calidad" in payload:
        material.calidad = payload.get("calidad")
    if "porcentaje_merma" in payload:
        material.porcentaje_merma = decimal_field(payload["porcentaje_merma"])
    if "precio_flete_unitario" in payload:
        material.precio_flete_unitario = decimal_field(payload["precio_flete_unitario"])
    db.session.commit()
    return jsonify(material.to_dict())

# --- Mano Obra ---
@bp.route("/manoobra", methods=["GET", "POST"])
def manoobra_collection():
    if request.method == "GET":
        mano_obra = ManoObra.query.order_by(ManoObra.puesto).all()
        return jsonify([mano.to_dict() for mano in mano_obra])

    payload = request.get_json(force=True)
    mano = ManoObra(
        puesto=payload["puesto"],
        salario_base=decimal_field(payload["salario_base"]),
        antiguedad_anios=payload.get("antiguedad_anios", 1),
        rendimiento_jornada=decimal_field(payload.get("rendimiento_jornada", Decimal("1.0"))),
        disciplina=payload.get("disciplina"),
        calidad=payload.get("calidad"),
        fecha_actualizacion=date.fromisoformat(payload.get("fecha_actualizacion")) if payload.get("fecha_actualizacion") else date.today(),
    )
    mano.refresh_fasar()
    db.session.add(mano)
    db.session.commit()
    return jsonify(mano.to_dict()), 201

@bp.route("/manoobra/<int:mano_id>", methods=["GET", "PUT", "DELETE"])
def manoobra_detail(mano_id: int):
    mano = ManoObra.query.get_or_404(mano_id)
    if request.method == "GET":
        return jsonify(mano.to_dict())

    if request.method == "DELETE":
        db.session.delete(mano)
        db.session.commit()
        return "", 204

    payload = request.get_json(force=True)
    mano.puesto = payload.get("puesto", mano.puesto)
    if "disciplina" in payload:
        mano.disciplina = payload.get("disciplina")
    if "calidad" in payload:
        mano.calidad = payload.get("calidad")
    if "fecha_actualizacion" in payload:
        mano.fecha_actualizacion = date.fromisoformat(payload["fecha_actualizacion"])
    if "salario_base" in payload:
        mano.salario_base = decimal_field(payload["salario_base"])
    if "antiguedad_anios" in payload:
        mano.antiguedad_anios = int(payload["antiguedad_anios"])
    if "rendimiento_jornada" in payload:
        mano.rendimiento_jornada = decimal_field(payload["rendimiento_jornada"])
    mano.refresh_fasar()
    db.session.commit()
    return jsonify(mano.to_dict())

# --- Equipo ---
@bp.route("/equipo", methods=["GET", "POST"])
def equipo_collection():
    if request.method == "GET":
        equipos = Equipo.query.order_by(Equipo.nombre).all()
        return jsonify([e.to_dict() for e in equipos])

    payload = request.get_json(force=True)
    equipo = Equipo(
        nombre=payload["nombre"],
        unidad=payload["unidad"],
        disciplina=payload.get("disciplina"),
        calidad=payload.get("calidad"),
        fecha_actualizacion=date.fromisoformat(payload.get("fecha_actualizacion")) if payload.get("fecha_actualizacion") else date.today(),
        costo_hora_maq=decimal_field(payload["costo_hora_maq"]),
    )
    db.session.add(equipo)
    db.session.commit()
    return jsonify(equipo.to_dict()), 201

@bp.route("/equipo/<int:equipo_id>", methods=["GET", "PUT", "DELETE"])
def equipo_detail(equipo_id: int):
    equipo = Equipo.query.get_or_404(equipo_id)
    if request.method == "GET":
        return jsonify(equipo.to_dict())

    if request.method == "DELETE":
        db.session.delete(equipo)
        db.session.commit()
        return "", 204

    payload = request.get_json(force=True)
    equipo.nombre = payload.get("nombre", equipo.nombre)
    equipo.unidad = payload.get("unidad", equipo.unidad)
    if "disciplina" in payload:
        equipo.disciplina = payload.get("disciplina")
    if "calidad" in payload:
        equipo.calidad = payload.get("calidad")
    if "fecha_actualizacion" in payload:
        equipo.fecha_actualizacion = date.fromisoformat(payload["fecha_actualizacion"])
    if "costo_hora_maq" in payload:
        equipo.costo_hora_maq = decimal_field(payload["costo_hora_maq"])
    db.session.commit()
    return jsonify(equipo.to_dict())

# --- Maquinaria ---
@bp.route("/maquinaria", methods=["GET", "POST"])
def maquinaria_collection():
    if request.method == "GET":
        maquinas = Maquinaria.query.order_by(Maquinaria.nombre).all()
        return jsonify([m.to_dict() for m in maquinas])

    payload = request.get_json(force=True)
    maquinaria = Maquinaria(
        nombre=payload["nombre"],
        costo_adquisicion=decimal_field(payload["costo_adquisicion"]),
        vida_util_horas=decimal_field(payload["vida_util_horas"]),
        tasa_interes_anual=decimal_field(payload.get("tasa_interes_anual", Decimal("0.10"))),
        rendimiento_horario=decimal_field(payload.get("rendimiento_horario", Decimal("1.0"))),
        disciplina=payload.get("disciplina"),
        calidad=payload.get("calidad"),
        fecha_actualizacion=date.fromisoformat(payload.get("fecha_actualizacion")) if payload.get("fecha_actualizacion") else date.today(),
    )
    maquinaria.actualizar_costo_posesion()
    db.session.add(maquinaria)
    db.session.commit()
    return jsonify(maquinaria.to_dict()), 201

@bp.route("/maquinaria/<int:maquinaria_id>", methods=["GET", "PUT", "DELETE"])
def maquinaria_detail(maquinaria_id: int):
    maquinaria = Maquinaria.query.get_or_404(maquinaria_id)
    if request.method == "GET":
        return jsonify(maquinaria.to_dict())

    if request.method == "DELETE":
        db.session.delete(maquinaria)
        db.session.commit()
        return "", 204

    payload = request.get_json(force=True)
    maquinaria.nombre = payload.get("nombre", maquinaria.nombre)
    if "disciplina" in payload:
        maquinaria.disciplina = payload.get("disciplina")
    if "calidad" in payload:
        maquinaria.calidad = payload.get("calidad")
    if "fecha_actualizacion" in payload:
        maquinaria.fecha_actualizacion = date.fromisoformat(payload["fecha_actualizacion"])
    if "costo_adquisicion" in payload:
        maquinaria.costo_adquisicion = decimal_field(payload["costo_adquisicion"])
    if "vida_util_horas" in payload:
        maquinaria.vida_util_horas = decimal_field(payload["vida_util_horas"])
    if "tasa_interes_anual" in payload:
        maquinaria.tasa_interes_anual = decimal_field(payload["tasa_interes_anual"])
    if "rendimiento_horario" in payload:
        maquinaria.rendimiento_horario = decimal_field(payload["rendimiento_horario"])
    maquinaria.actualizar_costo_posesion()
    db.session.commit()
    return jsonify(maquinaria.to_dict())

@bp.route("/catalogos/sugerir_precio_mercado", methods=["POST"])
def sugerir_precio_mercado():
    """
    Sugiere un precio de mercado para un insumo basado en nombre y unidad
    """
    data = request.get_json(force=True)
    nombre = data.get("nombre", "").strip()
    unidad = data.get("unidad", "").strip()

    if not nombre:
        return jsonify({"error": "Falta el nombre del insumo"}), 400

    try:
        # 1. Intentar encontrar coincidencia exacta en el catálogo
        material = Material.query.filter(
            db.func.lower(Material.nombre) == db.func.lower(nombre)
        ).first()

        if material and material.precio_unitario > 0:
            return jsonify({
                "precio_sugerido": float(material.precio_unitario),
                "fuente": "catalogo_real"
            }), 200

        # 2. Intentar búsqueda difusa por nombre
        from sqlalchemy import func
        # Buscar por nombre similar (palabras clave)
        similar_materials = Material.query.filter(
            func.lower(Material.nombre).contains(func.lower(nombre.split()[0]) if nombre.split() else "")
        ).limit(5).all()

        for mat in similar_materials:
            if mat.precio_unitario > 0:
                return jsonify({
                    "precio_sugerido": float(mat.precio_unitario),
                    "fuente": "catalogo_similar"
                }), 200

        # 3. Usar tabla simulada de precios comunes
        precios_simulados = {
            "cemento": 180.00,
            "cemento gris": 180.00,
            "cemento blanco": 220.00,
            "arena": 450.00,
            "grava": 600.00,
            "gravilla": 550.00,
            "varilla": 18.50,  # por kg
            "tabla": 280.00,   # por m2
            "tabique": 18.00,  # por pieza
            "clavo": 45.00,    # por kilo
            "alambre": 35.00,  # por kilo
            "yeso": 120.00,    # por saco
            "cal": 110.00,     # por saco
            "pintura": 180.00, # por litro
            "barniz": 220.00,  # por litro
            "masilla": 85.00,  # por litro
            "aguarras": 95.00, # por litro
        }

        # Buscar en el diccionario de precios simulados
        nombre_lower = nombre.lower()
        for clave, precio in precios_simulados.items():
            if clave in nombre_lower:
                return jsonify({
                    "precio_sugerido": precio,
                    "fuente": "tabla_simulada"
                }), 200

        # 4. Si todo falla, generar precio simulado
        base_precio = 100.0 + (abs(hash(nombre)) % 100)
        return jsonify({
            "precio_sugerido": round(base_precio, 2),
            "fuente": "simulado"
        }), 200

    except Exception as e:
        print(f"Error en sugerir_precio_mercado: {e}")
        # En caso de error, devolver un precio simulado
        base_precio = 100.0 + (abs(hash(nombre)) % 100)
        return jsonify({
            "precio_sugerido": round(base_precio, 2),
            "fuente": "simulado_error"
        }), 200


@bp.route("/catalogos/actualizar_precios_masivo", methods=["POST"])
def actualizar_precios_masivo():
    updates = request.get_json(force=True)
    if not isinstance(updates, list):
        return jsonify({"error": "El payload debe ser una lista"}), 400

    try:
        for item in updates:
            insumo_id = item.get("insumo_id")
            tipo = item.get("tipo")
            nuevo_precio = decimal_field(item.get("nuevo_precio"))

            if not all([insumo_id, tipo, item.get("nuevo_precio") is not None]):
                continue

            if tipo == "Material":
                insumo = Material.query.get(insumo_id)
                if insumo: insumo.precio_unitario = nuevo_precio
            elif tipo == "ManoObra":
                insumo = ManoObra.query.get(insumo_id)
                if insumo:
                    insumo.salario_base = nuevo_precio
                    insumo.refresh_fasar()
            elif tipo == "Equipo":
                insumo = Equipo.query.get(insumo_id)
                if insumo: insumo.costo_hora_maq = nuevo_precio
            elif tipo == "Maquinaria":
                insumo = Maquinaria.query.get(insumo_id)
                if insumo:
                    insumo.costo_adquisicion = nuevo_precio
                    insumo.actualizar_costo_posesion()

        db.session.commit()
        return jsonify({"mensaje": "Precios actualizados"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
