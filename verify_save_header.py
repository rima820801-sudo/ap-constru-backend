import time
from playwright.sync_api import sync_playwright

def verify_save_header():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.goto("http://localhost:3000")
        page.fill('input[type="text"]', "admin")
        page.fill('input[type="password"]', "admin123")
        page.click("button:has-text('Entrar')")
        page.wait_for_url("**/analisis")

        unique_suffix = str(int(time.time()))
        clave = f"CLAVE-{unique_suffix}"

        # Fill header
        page.fill('input[placeholder="Ej. Barda de tabique de 5 metros"]', clave)
        page.fill('input[placeholder="Ej. m2, Lote, Pza"]', "Pza")
        page.fill('textarea[placeholder="Describe la actividad y especificaciones"]', "Descripcion test save")

        # Click Save
        # Handle dialog
        page.on("dialog", lambda dialog: dialog.accept())
        page.click("button:has-text('Guardar')")

        # Check for "Guardado" badge
        try:
            page.wait_for_selector("text=Guardado", state="visible", timeout=5000)
            print("HEADER_SAVED")
        except:
            print("HEADER_SAVE_FAILED")

        browser.close()

if __name__ == "__main__":
    verify_save_header()
