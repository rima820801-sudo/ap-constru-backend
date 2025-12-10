import os

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev_secret_key_change_in_prod")
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", f"sqlite:///{os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data.sqlite3')}")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Session cookies
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'None'
    PERMANENT_SESSION_LIFETIME = 3600

    # Business Logic
    PRECIOS_OBSOLETOS_DIAS = int(os.environ.get("PRECIOS_OBSOLETOS_DIAS", "90"))
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
    # Default to gemini-1.5-flash which is currently stable. User can override with env var.
    GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")
