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
