from backend.services.gemini_service import extraer_json_de_texto

def test_json_extraction():
    # Case 1: Pure JSON
    t1 = '{"key": "value"}'
    assert extraer_json_de_texto(t1) == t1

    # Case 2: Markdown block
    t2 = '```json\n{"key": "value"}\n```'
    assert json.loads(extraer_json_de_texto(t2)) == {"key": "value"}

    # Case 3: Text around
    t3 = 'Here is the json: {"key": "value"} thanks.'
    assert json.loads(extraer_json_de_texto(t3)) == {"key": "value"}

    print("JSON extraction tests passed.")

import json
if __name__ == "__main__":
    test_json_extraction()
