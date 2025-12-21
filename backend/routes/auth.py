from flask import Blueprint, request, jsonify, session
from backend.models import User
from backend.extensions import db
from datetime import datetime, timedelta
from functools import wraps

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route("/register", methods=["POST"])
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data"}), 400

        username = data.get("username")
        password = data.get("password")

        if not username or not password:
            return jsonify({"error": "Usuario y contraseña requeridos"}), 400

        if User.query.filter_by(username=username).first():
            return jsonify({"error": "El usuario ya existe"}), 400

        # Crear usuario con 3 días de prueba
        trial_ends = datetime.utcnow() + timedelta(days=3)
        user = User(username=username, trial_ends_at=trial_ends)
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()

        # Iniciar sesión automáticamente
        session["user_id"] = user.id
        session.permanent = True

        return jsonify({"user": user.to_dict(), "message": "Registro exitoso"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

def trial_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401
        
        user = User.query.get(user_id)
        if not user or not user.is_trial_active():
            return jsonify({
                "error": "Trial expired", 
                "message": "Tu periodo de prueba de 3 días ha terminado. Por favor realiza el pago para continuar."
            }), 402
            
        return f(*args, **kwargs)
    return decorated_function

@bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data"}), 400

        username = data.get("username")
        password = data.get("password")

        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({"error": "Credenciales inválidas"}), 401

        if user.check_password(password):
            session["user_id"] = user.id
            session.permanent = True
            return jsonify({"user": user.to_dict()}), 200

        return jsonify({"error": "Credenciales inválidas"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/logout", methods=["POST"])
def logout():
    session.pop("user_id", None)
    return jsonify({"message": "Logged out"}), 200

@bp.route("/me", methods=["GET"])
def get_current_user():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"user": user.to_dict()}), 200
