
from pathlib import Path
path = Path('backend/services/gemini_service.py')
data = path.read_text()
start = data.index('def cotizar_con_gemini')
end = data.index('def construir_sugerencia_apu')
