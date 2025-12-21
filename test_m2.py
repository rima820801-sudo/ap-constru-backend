import os
import sys
from dotenv import load_dotenv

# Configurar path para importar backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend', '.env'))

from backend.services.gemini_service import generar_apu_con_gemini

test_cases = [
    {
        "name": "Fácil: Cuarto 4x4",
        "desc": "Cimentación y firme de concreto para un cuarto de 4m x 4m",
        "unidad": "Proyecto"
    },
    {
        "name": "Medio: Casa 2 pisos 6x10",
        "desc": "Construcción de casa habitación de dos plantas, cada una de 6m de frente por 10m de fondo, incluye muros y losas.",
        "unidad": "Global"
    },
    {
        "name": "Difícil: Local + Maniobras + Oficina",
        "desc": "Ampliación de local comercial de 10m x 15m con área de maniobras techada de 50m2 y oficina en planta alta de 4m x 5m.",
        "unidad": "Proyecto"
    }
]

print("--- INICIANDO PRUEBAS DE VALIDACIÓN DE METROS CUADRADOS ---\n")

for i, tc in enumerate(test_cases):
    print(f"Prueba {i+1}: {tc['name']}")
    print(f"Descripción: {tc['desc']}")
    
    # Probamos con calcular_por_m2=True ya que es el flujo principal para obtener ese dato
    resultado = generar_apu_con_gemini(tc['desc'], tc['unidad'], calcular_por_m2=True)
    
    if resultado:
        m2 = resultado.get("metros_cuadrados_construccion", 0)
        print(f"RESULTADO -> m2: {m2}")
        print(f"Explicación: {resultado.get('explicacion', 'No hay explicación')}")
    else:
        print("ERROR: No se recibió respuesta de Gemini.")
    print("-" * 50)

print("\n--- PRUEBAS FINALIZADAS ---")
