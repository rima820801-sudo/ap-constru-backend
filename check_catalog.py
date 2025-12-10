import time
from playwright.sync_api import sync_playwright

def check_catalog():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:3000")
        page.fill('input[type="text"]', "admin")
        page.fill('input[type="password"]', "admin123")
        page.click("button:has-text('Entrar')")
        page.wait_for_url("**/analisis")

        # Check dropdown options count
        # Selector for draft row select: select[name$="-draft-insumo-select"]
        # Need to wait for it to render
        page.wait_for_selector('select[name$="-draft-insumo-select"]')

        # Wait a bit for fetch to complete
        time.sleep(2)

        count = page.locator('select[name$="-draft-insumo-select"] option').count()
        print(f"Catalog Options: {count}")

        if count <= 1: # Only default "-- seleccionar --"
            print("CATALOG_EMPTY")
        else:
            print("CATALOG_HAS_ITEMS")

        browser.close()

if __name__ == "__main__":
    check_catalog()
