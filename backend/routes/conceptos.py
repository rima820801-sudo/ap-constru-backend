from flask import Blueprint, request, jsonify
from backend.models import Concepto, MatrizInsumo
from backend.extensions import db
from backend.services.calculation_service import decimal_field, calcular_precio_unitario, normalizar_factores

bp = Blueprint('conceptos', __name__, url_prefix='/api')

@bp.route("/conceptos", methods=["GET", "POST"])
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
def matriz_create():
    payload = request.get_json(force=True)
    registro = MatrizInsumo(
        concepto_id=payload["concepto"],
        tipo_insumo=payload["tipo_insumo"],
        id_insumo=payload["id_insumo"],
        cantidad=decimal_field(payload["cantidad"]),
    )
    db.session.add(registro)
    db.session.commit()
    return jsonify(registro.to_dict()), 201

@bp.route("/matriz/<int:registro_id>", methods=["PUT", "DELETE"])
def matriz_update(registro_id: int):
    registro = MatrizInsumo.query.get_or_404(registro_id)
    if request.method == "DELETE":
        db.session.delete(registro)
        db.session.commit()
        return "", 204
    # PUT logic
    return jsonify(registro.to_dict())

@bp.route("/conceptos/calcular_pu", methods=["POST"])
def calcular_pu_endpoint():
    payload = request.get_json(force=True)
    concepto_id = payload.get("concepto_id")
    matriz = payload.get("matriz")
    factores = normalizar_factores(payload.get("factores"))
    resultado = calcular_precio_unitario(concepto_id=concepto_id, matriz=matriz, factores=factores)
    return jsonify(resultado)
