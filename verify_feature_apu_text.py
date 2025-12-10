import os
from playwright.sync_api import sync_playwright

def verify_feature():
    # Ensure dir exists
    os.makedirs("/home/jules/verification", exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:3000")

        # Login
        page.fill('input[type="text"]', "admin")
        page.fill('input[type="password"]', "admin123")
        page.click("button:has-text('Entrar')")
        page.wait_for_url("**/analisis")

        # Fill form to enable button
        page.fill('textarea[placeholder="Describe la actividad y especificaciones"]', "Test Screenshot")

        # Click Button
        page.click("button:has-text('Sugerencia Gemini')")

        # Wait for the blue box to appear
        # The box has text "Detalle de la Sugerencia AI"
        try:
            page.wait_for_selector("text=Detalle de la Sugerencia AI", timeout=15000)
            print("Box found!")
        except:
            print("Box not found within timeout")

        # Screenshot
        page.screenshot(path="/home/jules/verification/verification.png")
        browser.close()

if __name__ == "__main__":
    verify_feature()
