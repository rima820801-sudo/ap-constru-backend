from flask import Blueprint, request, jsonify, session
from backend.models import User, Proyecto, Feedback, db
from backend.routes.auth import trial_required
from backend.services.notification_service import send_admin_notification
from functools import wraps
from datetime import datetime, timedelta

bp = Blueprint('admin', __name__, url_prefix='/api/admin')

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401
        
        user = User.query.get(user_id)
        if not user or not user.is_admin:
            return jsonify({"error": "Forbidden", "message": "Acceso restringido a administradores"}), 403
            
        return f(*args, **kwargs)
    return decorated_function

@bp.route("/overview", methods=["GET"])
@admin_required
def overview():
    total_users = User.query.count()
    project_count = Proyecto.query.count()
    
    # Usuarios activos (estimado: login reciente o actividad)
    # Por ahora tomamos los creados en las últimas 24h como "activos" para simplificar
    active_24h = User.query.filter(User.created_at >= datetime.utcnow() - timedelta(hours=24)).count()
    
    # Datos para AdminDashboard.tsx
    return jsonify({
        "total_users": total_users,
        "active_users": active_24h,
        "project_count": project_count,
        "storage_bytes": 0,
        "storage_mb": 0,
        "ia_requests_total": 0, # Necesitaríamos una tabla de logs para esto
        "ia_requests_today": 0,
        "recent_requests": []
    })

@bp.route("/users", methods=["GET"])
@admin_required
def list_users():
    users = User.query.all()
    return jsonify([u.to_dict() for u in users])

@bp.route("/users/<int:user_id>/toggle_premium", methods=["POST"])
@admin_required
def toggle_premium(user_id):
    user = User.query.get_or_404(user_id)
    user.is_premium = not user.is_premium
    db.session.commit()
    return jsonify({"user": user.to_dict(), "message": "Estado premium actualizado"})

@bp.route("/feedback", methods=["GET"])
@admin_required
def list_feedback():
    feedbacks = Feedback.query.order_by(Feedback.created_at.desc()).all()
    return jsonify([f.to_dict() for f in feedbacks])

@bp.route("/feedback", methods=["POST"])
def submit_feedback():
    data = request.get_json()
    if not data or not data.get("mensaje"):
        return jsonify({"error": "Mensaje requerido"}), 400
        
    user_id = session.get("user_id")
    fb = Feedback(
        user_id=user_id,
        tipo=data.get("tipo", "sugerencia"),
        mensaje=data.get("mensaje")
    )
    db.session.add(fb)
    db.session.commit()
    
    # Enviar correo al admin
    username = User.query.get(user_id).username if user_id else "Anónimo"
    send_admin_notification(data.get("tipo", "sugerencia"), data.get("mensaje"), username)

    return jsonify({"message": "Feedback enviado con éxito"}), 201

@bp.route("/feedback/<int:fb_id>/resolver", methods=["POST"])
@admin_required
def resolve_feedback(fb_id):
    fb = Feedback.query.get_or_404(fb_id)
    fb.estado = "resuelto"
    db.session.commit()
    return jsonify({"message": "Estado actualizado"})
