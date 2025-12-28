from flask import Blueprint, request, jsonify
from backend.routes.auth import trial_required
from backend.models import Concepto, MatrizInsumo
from backend.extensions import db
from backend.services.calculation_service import decimal_field, calcular_precio_unitario, normalizar_factores

bp = Blueprint('conceptos', __name__, url_prefix='/api')

@bp.route("/conceptos", methods=["GET", "POST"])
@trial_required
def conceptos_collection():
    if request.method == "GET":
        conceptos = Concepto.query.order_by(Concepto.clave).all()
        return jsonify([concepto.to_dict() for concepto in conceptos])

    payload = request.get_json(force=True)
    concepto = Concepto(
        clave=payload["clave"],
        descripcion=payload["descripcion"],
        unidad_concepto=payload["unidad_concepto"],
    )
    db.session.add(concepto)
    db.session.commit()
    return jsonify(concepto.to_dict()), 201

@bp.route("/conceptos/<int:concepto_id>", methods=["GET", "PUT", "DELETE"])
@trial_required
def concepto_detail(concepto_id: int):
    concepto = Concepto.query.get_or_404(concepto_id)
    if request.method == "GET":
        return jsonify(concepto.to_dict())
    if request.method == "DELETE":
        db.session.delete(concepto)
        db.session.commit()
        return "", 204

    payload = request.get_json(force=True)
    concepto.clave = payload.get("clave", concepto.clave)
    concepto.descripcion = payload.get("descripcion", concepto.descripcion)
    concepto.unidad_concepto = payload.get("unidad_concepto", concepto.unidad_concepto)
    db.session.commit()
    return jsonify(concepto.to_dict())

@bp.route("/conceptos/<int:concepto_id>/matriz", methods=["GET"])
def concepto_matriz(concepto_id: int):
    Concepto.query.get_or_404(concepto_id)
    registros = MatrizInsumo.query.filter_by(concepto_id=concepto_id).all()
    return jsonify([registro.to_dict() for registro in registros])

@bp.route("/matriz", methods=["POST"])
@trial_required
def matriz_create():
    payload = request.get_json(force=True)
    registro = MatrizInsumo(
        concepto_id=payload["concepto"],
        tipo_insumo=payload["tipo_insumo"],
        id_insumo=payload["id_insumo"],
        cantidad=decimal_field(payload["cantidad"]),
        porcentaje_merma=decimal_field(payload.get("porcentaje_merma")) if payload.get("porcentaje_merma") is not None else None,
        precio_flete_unitario=decimal_field(payload.get("precio_flete_unitario")) if payload.get("precio_flete_unitario") is not None else None,
        rendimiento_jornada=decimal_field(payload.get("rendimiento_jornada")) if payload.get("rendimiento_jornada") is not None else None,
        factor_uso=decimal_field(payload.get("factor_uso")) if payload.get("factor_uso") is not None else None,
        precio_custom=decimal_field(payload.get("precio_custom")) if payload.get("precio_custom") is not None else None,
        unidad_custom=payload.get("unidad_custom"),
    )
    db.session.add(registro)
    db.session.commit()
    return jsonify(registro.to_dict()), 201

@bp.route("/matriz/<int:registro_id>", methods=["PUT", "DELETE"])
@trial_required
def matriz_update(registro_id: int):
    registro = MatrizInsumo.query.get_or_404(registro_id)
    if request.method == "DELETE":
        db.session.delete(registro)
        db.session.commit()
        return "", 204
    payload = request.get_json(force=True)
    registro.cantidad = decimal_field(payload.get("cantidad", registro.cantidad))
    
    if "porcentaje_merma" in payload:
        registro.porcentaje_merma = decimal_field(payload["porcentaje_merma"]) if payload["porcentaje_merma"] is not None else None
    if "precio_flete_unitario" in payload:
        registro.precio_flete_unitario = decimal_field(payload["precio_flete_unitario"]) if payload["precio_flete_unitario"] is not None else None
    if "rendimiento_jornada" in payload:
        registro.rendimiento_jornada = decimal_field(payload["rendimiento_jornada"]) if payload["rendimiento_jornada"] is not None else None
    if "factor_uso" in payload:
        registro.factor_uso = decimal_field(payload["factor_uso"]) if payload["factor_uso"] is not None else None
    if "precio_custom" in payload:
        registro.precio_custom = decimal_field(payload["precio_custom"]) if payload["precio_custom"] is not None else None
    if "unidad_custom" in payload:
        registro.unidad_custom = payload["unidad_custom"]

    db.session.commit()
    return jsonify(registro.to_dict())

@bp.route("/conceptos/calcular_pu", methods=["POST"])
@trial_required
def calcular_pu_endpoint():
    payload = request.get_json(force=True)
    concepto_id = payload.get("concepto_id")
    matriz = payload.get("matriz")
    factores = normalizar_factores(payload.get("factores"))
    resultado = calcular_precio_unitario(concepto_id=concepto_id, matriz=matriz, factores=factores)
    return jsonify(resultado)
