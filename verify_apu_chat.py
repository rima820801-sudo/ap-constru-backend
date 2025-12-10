import time
from playwright.sync_api import sync_playwright

def verify_apu_chat():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to login...")
        page.goto("http://localhost:3000")

        # Login
        print("Logging in...")
        page.fill('input[type="text"]', "admin")
        page.fill('input[type="password"]', "admin123")
        page.click("button:has-text('Entrar')")

        # Wait for navigation to /analisis
        page.wait_for_url("**/analisis", timeout=10000)
        print("Logged in, on /analisis")

        # Fill form
        # Selectors based on AnalisisPuPage.tsx:
        # Placeholder: "Ej. Barda de tabique de 5 metros"
        page.fill('input[placeholder="Ej. Barda de tabique de 5 metros"]', "Concepto Test")

        # Placeholder: "Ej. m2, Lote, Pza"
        page.fill('input[placeholder="Ej. m2, Lote, Pza"]', "m2")

        # Placeholder: "Describe la actividad y especificaciones"
        print("Filling description...")
        page.fill('textarea[placeholder="Describe la actividad y especificaciones"]', "TEST_MISSING_EXPLANATION")

        # Click "Sugerencia Gemini"
        # Button contains text "Sugerencia Gemini"
        print("Clicking Gemini button...")
        page.click("button:has-text('Sugerencia Gemini')")

        # Wait for "MISSING_EXPLANATION" to appear
        print("Waiting for explanation...")
        try:
            page.wait_for_selector("text=MISSING_EXPLANATION", timeout=10000)
            print("FOUND_EXPLANATION")
        except Exception as e:
            print("NOT_FOUND")
            # Take screenshot if failed
            page.screenshot(path="verification_failure.png")
            print(f"Error: {e}")

        browser.close()

if __name__ == "__main__":
    verify_apu_chat()
