from flask import Blueprint, request, jsonify
from backend.services.gemini_service import generar_apu_con_gemini, cotizar_con_gemini, construir_sugerencia_apu, construir_explicacion_para_chat, construir_matriz_desde_gemini
from backend.services.clarification_service import generar_preguntas_clarificadoras
from backend.models import Concepto

bp = Blueprint('ia', __name__, url_prefix='/api/ia')


@bp.route("/preguntas_clarificadoras", methods=["POST"])
def preguntas_clarificadoras():
    """
    Genera preguntas clarificadoras antes de generar el APU
    """
    data = request.get_json() or {}
    descripcion = data.get("descripcion", "")

    preguntas = generar_preguntas_clarificadoras(descripcion)

    return jsonify({
        "descripcion_original": descripcion,
        "preguntas": preguntas,
        "cantidad": len(preguntas)
    })

@bp.route("/chat_apu", methods=["POST"])
def chat_apu():
    data = request.get_json() or {}
    descripcion = data.get("descripcion", "")
    unidad = data.get("unidad", "") or ""
    concepto_id = data.get("concepto_id")

    calcular_por_m2 = bool(data.get("calcular_por_m2")) if "calcular_por_m2" in data else unidad.lower() == "m2"
    if not unidad and calcular_por_m2:
        unidad = "m2"

    # Verificar si vienen respuestas a preguntas clarificadoras
    respuestas_clarificadoras = data.get("respuestas_clarificadoras", [])

    data_gemini = generar_apu_con_gemini(descripcion, unidad, calcular_por_m2)

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
        "metros_cuadrados_construccion": metros_cuadrados,
        "preguntas_clarificadoras": generar_preguntas_clarificadoras(descripcion) if not respuestas_clarificadoras else []
    })

@bp.route("/cotizar", methods=["POST"])
def cotizar_material():
    data = request.get_json()
    material = data.get("material")
    if not material:
        return jsonify({"error": "Falta material"}), 400

    fallback = {
        "tienda1": "Generico A", "precio1": 0.0, "tienda1_url": "",
        "tienda2": "Generico B", "precio2": 0.0, "tienda2_url": "",
        "tienda3": "Generico C", "precio3": 0.0, "tienda3_url": "",
    }

    resultado = cotizar_con_gemini(material)
    if not resultado:
        return jsonify(fallback), 200

    # Ensure fallback keys exist even if Gemini omits them
    merged = {**fallback, **resultado}
    return jsonify(merged), 200

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
