import json
import re
import sys
from typing import Any, Dict, List, Optional

import google.genai as genai

from backend.config import Config
from backend.services.gemini_service import extraer_json_de_texto

ClarifyingQuestion = Dict[str, Any]

GENAI_CLIENT: Optional[genai.Client] = (
    genai.Client(api_key=Config.GEMINI_API_KEY) if Config.GEMINI_API_KEY else None
)

def _get_genai_client() -> Optional[genai.Client]:
    if not GENAI_CLIENT:
        print("Error: GEMINI_API_KEY no configurada para generar preguntas clarificadoras.", file=sys.stderr)
    return GENAI_CLIENT


def generar_preguntas_clarificadoras(descripcion: str) -> List[ClarifyingQuestion]:
    """
    Intenta generar preguntas basadas en Gemini; si falla, usa heurísticas simples.
    """
    texto = (descripcion or "").strip()
    if Config.GEMINI_API_KEY and texto:
        preguntas = _generar_con_gemini(texto)
        if preguntas:
            return preguntas

    return _generar_con_heuristica(texto)


def _generar_con_gemini(descripcion: str) -> List[ClarifyingQuestion]:
    prompt = f"""
Eres un ingeniero civil especializado en análisis de precios unitarios (APU) para construcción en México.
Tu objetivo es hacer preguntas TÉCNICAS e INTELIGENTES que ayuden a calcular correctamente el proyecto.

DESCRIPCIÓN DEL PROYECTO:
"{descripcion}"

═══════════════════════════════════════════════════════════════════════════════
🎯 OBJETIVO DE LAS PREGUNTAS
═══════════════════════════════════════════════════════════════════════════════

Las preguntas deben ayudar a:
1. ACLARAR dimensiones faltantes o ambiguas
2. IDENTIFICAR elementos a restar (puertas, ventanas, aberturas)
3. DEFINIR especificaciones técnicas que afectan cantidades
4. DETERMINAR el alcance exacto del trabajo

═══════════════════════════════════════════════════════════════════════════════
❌ NO PREGUNTES SOBRE:
═══════════════════════════════════════════════════════════════════════════════

- Materiales genéricos ("¿De qué material quieres la puerta?")
- Acabados estéticos ("¿Qué color prefieres?")
- Preferencias personales sin impacto en cantidades
- Cosas que ya están claras en la descripción

═══════════════════════════════════════════════════════════════════════════════
✅ SÍ PREGUNTA SOBRE:
═══════════════════════════════════════════════════════════════════════════════

📐 DIMENSIONES FALTANTES:
- "¿Cuál es el espesor de la pared?" (afecta volumen de concreto/mortero)
- "¿Cuántas caras de la pared llevarán tablarroca?" (1 o 2 caras)
- "¿A qué distancia se colocarán los montantes verticales?" (40cm, 60cm)

🚪 ELEMENTOS A RESTAR:
- "¿Cuántas puertas/ventanas tiene el muro y de qué dimensiones?"
- "¿El área mencionada ya descuenta las aberturas o es área bruta?"

🔧 ESPECIFICACIONES TÉCNICAS:
- "¿Los perfiles metálicos son calibre 26 o 20?" (afecta precio)
- "¿La losa es maciza o aligerada?" (cambia completamente el cálculo)
- "¿Requiere cimbra aparente o común?" (afecta costo)

📏 ALCANCE DEL TRABAJO:
- "¿El precio incluye cimentación o solo el muro visible?"
- "¿Se requiere instalación eléctrica dentro de la pared?"
- "¿Cuántos castillos y dalas se necesitan?" (cada cuántos metros)

═══════════════════════════════════════════════════════════════════════════════

Genera entre 3 y 5 preguntas TÉCNICAS siguiendo estos criterios.

RESPONDE EXCLUSIVAMENTE con un arreglo JSON:

[
  {{
    "pregunta": "Pregunta técnica específica",
    "opciones": ["Opción 1 con valores específicos", "Opción 2 con valores específicos"],
    "contexto": "Por qué esta pregunta afecta el cálculo de cantidades"
  }}
]

EJEMPLOS DE BUENAS PREGUNTAS:

Para "Pared de tablarroca de 2.80m x 6.36m con puerta":
✅ "¿La pared lleva tablarroca en una sola cara o en ambas caras?"
   Opciones: ["Una cara (8.9 m²)", "Ambas caras (17.8 m²)"]
   Contexto: "Esto duplica la cantidad de placas de yeso necesarias"

✅ "¿Cuáles son las dimensiones exactas de la puerta a descontar?"
   Opciones: ["2.10m x 0.90m (estándar)", "2.40m x 1.20m (doble)"]
   Contexto: "Se restará esta área del total de tablarroca"

✅ "¿A qué separación se colocarán los montantes verticales?"
   Opciones: ["40 cm (más resistente)", "60 cm (económico)"]
   Contexto: "Esto determina la cantidad de perfiles metálicos en metros lineales"

EJEMPLOS DE MALAS PREGUNTAS (NO HAGAS ESTO):
❌ "¿De qué material quieres la puerta?" (no afecta el cálculo de la pared)
❌ "¿Qué color de pintura prefieres?" (no es relevante para el APU)
❌ "¿Quieres acabado liso o texturizado?" (muy genérico, sin valores)
"""

    try:
        client = _get_genai_client()
        if not client:
            return []

        respuesta = client.models.generate_content(
            model=Config.GEMINI_MODEL,
            contents=prompt,
            config={"temperature": 0.3},
        )
        texto_respuesta = getattr(respuesta, "text", "") or ""
        bloque = extraer_json_de_texto(texto_respuesta)
        if not bloque:
            print("Clarification Gemini: no se encontró JSON en la respuesta.", file=sys.stderr)
            return []

        datos = json.loads(bloque)
        if isinstance(datos, list):
            preguntas: List[ClarifyingQuestion] = []
            for pregunta in datos:
                if isinstance(pregunta, dict) and pregunta.get("pregunta"):
                    preguntas.append({
                        "pregunta": pregunta.get("pregunta"),
                        "opciones": pregunta.get("opciones"),
                        "contexto": pregunta.get("contexto"),
                    })
            return _filtrar_preguntas_unicas(preguntas)[:5]

        print("Clarification Gemini: el JSON no es un arreglo válido.", file=sys.stderr)
    except Exception as error:
        print(f"Clarification Gemini error: {error}", file=sys.stderr)

    return []


def _pregunta_base(pregunta: str, opciones: Optional[List[str]] = None, contexto: Optional[str] = None) -> ClarifyingQuestion:
    resultado = {"pregunta": pregunta}
    if opciones:
        resultado["opciones"] = opciones
    if contexto:
        resultado["contexto"] = contexto
    return resultado


def _generar_con_heuristica(descripcion: str) -> List[ClarifyingQuestion]:
    texto = (descripcion or "").lower()
    preguntas: List[ClarifyingQuestion] = []

    if any(palabra in texto for palabra in ["perimetral", "perímetro", "frente", "alrededor", "contorno"]):
        preguntas.append(_pregunta_base(
            "¿Las dimensiones proporcionadas son del terreno completo o solo del cierre?",
            opciones=["Terreno completo", "Solo la barda", "Solo un tramo puntual"],
            contexto="Confirma si se cubre todo el perímetro."
        ))
        preguntas.append(_pregunta_base(
            "¿La altura mencionada aplica a toda la barda o solo a la parte visible?",
            opciones=["Toda la barda", "Solo la fachada", "Altura variable"],
            contexto="Define si hay diferencias entre caras."
        ))
        preguntas.append(_pregunta_base(
            "¿Incluye el cálculo algún tipo de cimentación especial?",
            contexto="La cimentación impacta en materiales y excavación."
        ))

    if re.search(r'\d+\s*x\s*\d+', texto) or re.search(r'\d+\s*m\s*x\s*\d+\s*m', texto):
        preguntas.append(_pregunta_base(
            "¿Deseas calcular la obra en metros cuadrados (área) o metros lineales (longitud)?",
            opciones=["Metros cuadrados", "Metros lineales", "Cálculo global"]
        ))
        preguntas.append(_pregunta_base(
            "¿Hay espacios como portones o puertas que debamos descontar?",
            opciones=["Sí, uno o varios portones", "No, es continuo"]
        ))

    if any(palabra in texto for palabra in ["barda", "muro", "pared", "cerca"]):
        preguntas.append(_pregunta_base(
            "¿Qué tipo de material prefieres para la obra?",
            opciones=["Block armado", "Concreto simple", "Lámina o panel"],
            contexto="Se requiere saber si hay acabados específicos."
        ))
        preguntas.append(_pregunta_base(
            "¿Requieres algún tipo especial de cimentación?",
            opciones=["Zapatas corridas", "Pilotes", "Sin cimentación especial"]
        ))

    if any(palabra in texto for palabra in ["portón", "puerta", "entrada", "acceso"]):
        preguntas.append(_pregunta_base(
            "¿El espacio de acceso es el único que debe descontarse o hay más?",
            opciones=["Solo ese acceso", "Más accesos similares"]
        ))
        preguntas.append(_pregunta_base(
            "¿Ese acceso afecta ambas caras del perímetro o solo una?",
            opciones=["Ambas", "Solo una"]
        ))

    if len(preguntas) < 3:
        preguntas.append(_pregunta_base(
            "¿Qué acabado deseas en la superficie final?",
            opciones=["Liso", "Pintado", "Texturizado"]
        ))
        preguntas.append(_pregunta_base(
            "¿Hay consideraciones del suelo o del entorno que debamos saber?"
        ))
        preguntas.append(_pregunta_base(
            "¿Debemos incluir medidas de seguridad o protección adicionales?",
            opciones=["Sí, andamios/cercas", "No"]
        ))

    return _filtrar_preguntas_unicas(preguntas)[:5]


def _filtrar_preguntas_unicas(preguntas: List[ClarifyingQuestion]) -> List[ClarifyingQuestion]:
    vistas: set[str] = set()
    resultado: List[ClarifyingQuestion] = []
    for pregunta in preguntas:
        texto = pregunta.get("pregunta", "")
        llave = texto.strip().lower()
        if llave and llave not in vistas:
            vistas.add(llave)
            resultado.append(pregunta)
    return resultado
