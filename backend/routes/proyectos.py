from flask import Blueprint, request, jsonify, session
from backend.routes.auth import trial_required
from datetime import date
from backend.models import Proyecto, Partida, DetallePresupuesto
from backend.extensions import db
from backend.services.calculation_service import decimal_field, obtener_factores_de_proyecto, calcular_precio_unitario, aplicar_configuracion_proyecto

bp = Blueprint('proyectos', __name__, url_prefix='/api')

@bp.route("/proyectos", methods=["GET", "POST"])
@trial_required
def proyectos_collection():
    user_id = session.get("user_id")
    if request.method == "GET":
        proyectos = Proyecto.query.filter_by(user_id=user_id).order_by(Proyecto.fecha_creacion.desc()).all()
        return jsonify([proy.to_dict() for proy in proyectos])

    payload = request.get_json(force=True)
    proyecto = Proyecto(
        user_id=user_id,
        nombre_proyecto=payload["nombre_proyecto"],
        ubicacion=payload.get("ubicacion"),
        descripcion=payload.get("descripcion", ""),
        fecha_creacion=date.today(),
    )
    aplicar_configuracion_proyecto(proyecto, payload)
    db.session.add(proyecto)
    db.session.commit()
    return jsonify(proyecto.to_dict()), 201

@bp.route("/proyectos/<int:proyecto_id>", methods=["GET", "PUT", "DELETE"])
@trial_required
def proyecto_detail(proyecto_id: int):
    user_id = session.get("user_id")
    proyecto = Proyecto.query.filter_by(id=proyecto_id, user_id=user_id).first_or_404()
    if request.method == "GET":
        return jsonify(proyecto.to_dict())
    if request.method == "DELETE":
        db.session.delete(proyecto)
        db.session.commit()
        return "", 204

    payload = request.get_json(force=True)
    proyecto.nombre_proyecto = payload.get("nombre_proyecto", proyecto.nombre_proyecto)
    if "ubicacion" in payload:
        proyecto.ubicacion = payload["ubicacion"]
    if "descripcion" in payload:
        proyecto.descripcion = payload["descripcion"]
    aplicar_configuracion_proyecto(proyecto, payload)
    db.session.commit()
    return jsonify(proyecto.to_dict())

@bp.route("/proyectos/<int:proyecto_id>/partidas", methods=["GET"])
@trial_required
def partidas_por_proyecto(proyecto_id: int):
    user_id = session.get("user_id")
    proyecto = Proyecto.query.filter_by(id=proyecto_id, user_id=user_id).first_or_404()
    partidas = Partida.query.filter_by(proyecto_id=proyecto.id).all()
    return jsonify([p.to_dict() for p in partidas])

@bp.route("/partidas", methods=["POST"])
@trial_required
def partidas_create():
    payload = request.get_json(force=True)
    partida = Partida(
        proyecto_id=payload["proyecto"],
        nombre_partida=payload["nombre_partida"],
    )
    db.session.add(partida)
    db.session.commit()
    return jsonify(partida.to_dict()), 201

@bp.route("/partidas/<int:partida_id>/detalles", methods=["GET"])
def detalles_por_partida(partida_id: int):
    detalles = DetallePresupuesto.query.filter_by(partida_id=partida_id).all()
    return jsonify([d.to_dict() for d in detalles])

@bp.route("/detalles-presupuesto", methods=["POST"])
@trial_required
def detalle_create():
    payload = request.get_json(force=True)
    concepto_id = payload["concepto"]
    partida = Partida.query.get_or_404(payload["partida"])

    factores = obtener_factores_de_proyecto(partida.proyecto)
    resultado_pu = calcular_precio_unitario(concepto_id=concepto_id, factores=factores)

    detalle = DetallePresupuesto(
        partida_id=partida.id,
        concepto_id=concepto_id,
        cantidad_obra=decimal_field(payload["cantidad_obra"]),
        precio_unitario_calculado=decimal_field(resultado_pu["precio_unitario"]),
        costo_directo=decimal_field(resultado_pu["costo_directo"]),
    )
    db.session.add(detalle)
    db.session.commit()
    return jsonify(detalle.to_dict()), 201
