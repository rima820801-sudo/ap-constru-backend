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

    @app.route("/", methods=["GET"])
    def index():
        return """
        <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #f8fafc; color: #1e293b; height: 100vh;">
            <div style="background: white; padding: 40px; border-radius: 20px; display: inline-block; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                <h1 style="color: #4f46e5; margin-bottom: 10px;">🚀 API de AP-Constru está Activa</h1>
                <p style="font-size: 1.1rem; color: #64748b;">El backend está encendido y listo para trabajar.</p>
                <div style="margin-top: 20px; font-size: 0.9rem; color: #94a3b8;">
                    Puedes cerrar esta pestaña y volver a la <a href="https://ap-constru-backend-1.onrender.com" style="color: #4f46e5; text-decoration: none; font-weight: bold;">Aplicación Principal</a>.
                </div>
            </div>
        </div>
        """, 200

    # Health Check Endpoint
    @app.route("/api/health", methods=["GET"])
    def health_check():
        return {"status": "ok", "db": "connected"}, 200

    # Ensure DB is created and migrated
    with app.app_context():
        import backend.models  # Import all models to ensure they are registered
        db.create_all()
        _migrate_database() # Auto-fix for existing databases
        _create_default_admin()
        ConstantesFASAR.get_singleton()

    return app

def _create_default_admin():
    try:
        # Buscamos el nuevo administrador
        admin_user = User.query.filter_by(username="sarsjs88").first()
        if not admin_user:
            admin_user = User(username="sarsjs88", is_admin=True)
            admin_user.set_password("Bryjasa10")
            db.session.add(admin_user)
            db.session.commit()
            print("🚀 Usuario administrador 'sarsjs88' creado con éxito.")
        
        # Opcional: Si existía el 'admin' genérico anterior, podrías desactivarlo o dejarlo.
        # Por seguridad mejor lo buscamos y le cambiamos la contraseña o lo borramos si es el de default.
        old_admin = User.query.filter_by(username="admin").first()
        if old_admin and old_admin.check_password("admin123"):
            # Si tiene la clave de fábrica, lo actualizamos por seguridad
            old_admin.username = "sarsjs88_legacy"
            old_admin.set_password("Bryjasa10_Safe_" + str(os.urandom(4).hex()))
            db.session.commit()

    except Exception as e:
        print(f"Error creando admin: {e}")

def _migrate_database():
    """Ejecuta migraciones manuales para SQLite para añadir columnas faltantes."""
    import sqlite3
    # Extraer la ruta del archivo desde la URI de SQLAlchemy
    db_uri = Config.SQLALCHEMY_DATABASE_URI
    if not db_uri.startswith("sqlite:///"):
        return
    
    db_path = db_uri.replace("sqlite:///", "")
    
    if not os.path.exists(db_path):
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Columnas a verificar/añadir
        migrations = [
            ("ALTER TABLE users ADD COLUMN is_premium BOOLEAN DEFAULT 0", "users.is_premium"),
            ("ALTER TABLE users ADD COLUMN trial_ends_at DATETIME", "users.trial_ends_at"),
            
            # Columnas para ConstantesFASAR
            ("ALTER TABLE constantes_fasar ADD COLUMN user_id INTEGER REFERENCES users(id)", "constantes_fasar.user_id"),
            ("ALTER TABLE constantes_fasar ADD COLUMN valor_uma NUMERIC(10, 2) DEFAULT 108.57", "constantes_fasar.valor_uma"),
            ("ALTER TABLE constantes_fasar ADD COLUMN salario_minimo_general NUMERIC(10, 2) DEFAULT 248.93", "constantes_fasar.salario_minimo_general"),
            ("ALTER TABLE constantes_fasar ADD COLUMN dias_festivos_costumbre NUMERIC(6, 2) DEFAULT 3.0", "constantes_fasar.dias_festivos_costumbre"),
            ("ALTER TABLE constantes_fasar ADD COLUMN dias_mal_tiempo NUMERIC(6, 2) DEFAULT 2.0", "constantes_fasar.dias_mal_tiempo"),
            ("ALTER TABLE constantes_fasar ADD COLUMN dias_permisos_sindicales NUMERIC(6, 2) DEFAULT 2.0", "constantes_fasar.dias_permisos_sindicales"),
            ("ALTER TABLE constantes_fasar ADD COLUMN prima_riesgo_trabajo_patronal NUMERIC(10, 6) DEFAULT 7.58875", "constantes_fasar.prima_riesgo_trabajo_patronal"),
            ("ALTER TABLE constantes_fasar ADD COLUMN impuesto_sobre_nomina NUMERIC(6, 4) DEFAULT 0.03", "constantes_fasar.impuesto_sobre_nomina"),

            # Aislamiento por usuario
            ("ALTER TABLE materiales ADD COLUMN user_id INTEGER REFERENCES users(id)", "materiales.user_id"),
            ("ALTER TABLE mano_obra ADD COLUMN user_id INTEGER REFERENCES users(id)", "mano_obra.user_id"),
            ("ALTER TABLE equipos ADD COLUMN user_id INTEGER REFERENCES users(id)", "equipos.user_id"),
            ("ALTER TABLE maquinaria ADD COLUMN user_id INTEGER REFERENCES users(id)", "maquinaria.user_id"),
            ("ALTER TABLE conceptos ADD COLUMN user_id INTEGER REFERENCES users(id)", "conceptos.user_id"),
            ("ALTER TABLE proyectos ADD COLUMN user_id INTEGER REFERENCES users(id)", "proyectos.user_id"),
        ]
        
        for sql, col_name in migrations:
            try:
                cursor.execute(sql)
                print(f"✅ Migración: Columna '{col_name}' añadida.")
            except sqlite3.OperationalError:
                # Si falla es porque probablemente ya existe
                pass
        
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error en auto-migración: {e}")

# Create app instance for Gunicorn
app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
