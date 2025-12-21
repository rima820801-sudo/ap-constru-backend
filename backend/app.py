import sys
import os

from dotenv import load_dotenv

# Add the parent directory to sys.path to allow absolute imports (e.g., 'from backend.config ...')
# even when running from inside the 'backend' directory (common in Render/Gunicorn setups).
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

from flask import Flask
from werkzeug.middleware.proxy_fix import ProxyFix
from backend.config import Config
from backend.extensions import db, cors
from backend.models import User, ConstantesFASAR

# Import blueprints
from backend.routes import auth, catalogos, conceptos, proyectos, ia, admin

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # ProxyFix for Render
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

    # Initialize extensions
    db.init_app(app)
    cors.init_app(app, resources={r"/api/*": {
        "origins": [
            r"^https://.*\.onrender\.com$",
            "http://localhost:5173",
            "http://localhost:3000"
        ],
        "supports_credentials": True,
        "allow_headers": "*",
        "methods": "*"
    }})

    # Register Blueprints
    app.register_blueprint(auth.bp)
    app.register_blueprint(catalogos.bp)
    app.register_blueprint(conceptos.bp)
    app.register_blueprint(proyectos.bp)
    app.register_blueprint(ia.bp)
    app.register_blueprint(admin.bp)

    # Health Check Endpoint
    @app.route("/api/health", methods=["GET"])
    def health_check():
        return {"status": "ok", "db": "connected"}, 200

    # Ensure DB is created
    with app.app_context():
        import backend.models  # Import all models to ensure they are registered
        db.create_all()
        _create_default_admin()
        ConstantesFASAR.get_singleton()

    return app

def _create_default_admin():
    try:
        admin_user = User.query.filter_by(username="admin").first()
        if not admin_user:
            admin_user = User(username="admin", is_admin=True)
            admin_user.set_password("admin123")
            db.session.add(admin_user)
            db.session.commit()
            print("Usuario 'admin' creado.")
    except Exception as e:
        print(f"Error creando admin: {e}")

# Create app instance for Gunicorn
app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
