from flask import Blueprint, request, jsonify
from backend.services.gemini_service import generar_apu_con_gemini, cotizar_con_gemini, construir_sugerencia_apu, construir_explicacion_para_chat, construir_matriz_desde_gemini
from backend.models import Concepto

bp = Blueprint('ia', __name__, url_prefix='/api/ia')

@bp.route("/chat_apu", methods=["POST"])
def chat_apu():
    data = request.get_json() or {}
    descripcion = data.get("descripcion", "")
    unidad = data.get("unidad", "")
    concepto_id = data.get("concepto_id")

    data_gemini = generar_apu_con_gemini(descripcion, unidad)

    metros_cuadrados = 0.0
    if data_gemini:
        sugerencias = construir_matriz_desde_gemini(data_gemini)
        explicacion = data_gemini.get("explicacion", "")
        metros_cuadrados = data_gemini.get("metros_cuadrados_construccion", 0.0)
    else:
        # Fallback to local heuristics
        sugerencias = construir_sugerencia_apu(descripcion, concepto_id)
        explicacion = construir_explicacion_para_chat(descripcion, sugerencias)

    return jsonify({
        "explicacion": explicacion,
        "insumos": sugerencias,
        "metros_cuadrados_construccion": metros_cuadrados
    })

@bp.route("/cotizar", methods=["POST"])
def cotizar_material():
    data = request.get_json()
    material = data.get("material")
    if not material:
        return jsonify({"error": "Falta material"}), 400

    resultado = cotizar_con_gemini(material)
    if not resultado:
        return jsonify({
                "tienda1": "Generico A", "precio1": 0.0,
                "tienda2": "Generico B", "precio2": 0.0,
                "tienda3": "Generico C", "precio3": 0.0
            }), 200

    return jsonify(resultado), 200

@bp.route("/explicar_sugerencia", methods=["GET"])
def explicar_sugerencia():
    concepto_id = request.args.get("concepto_id", type=int)
    descripcion = request.args.get("descripcion_concepto", "")
    if concepto_id and not descripcion:
        concepto = Concepto.query.get(concepto_id)
        if concepto:
            descripcion = concepto.descripcion

    sugerencias = construir_sugerencia_apu(descripcion, concepto_id)
    explicacion = construir_explicacion_para_chat(descripcion, sugerencias)
    return jsonify({"explicacion": explicacion})
