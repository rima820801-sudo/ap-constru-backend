import sys
from app import app, db, User

def create_admin():
    print("--- Crear Usuario Administrador ---")
    username = input("Username: ").strip()
    if not username:
        print("El username es requerido.")
        return

    password = input("Password: ").strip()
    if not password:
        print("El password es requerido.")
        return

    with app.app_context():
        # Asegurar que la tabla existe
        db.create_all()

        # Verificar si existe
        if User.query.filter_by(username=username).first():
            print(f"El usuario '{username}' ya existe.")
            return

        user = User(username=username, is_admin=True)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        print(f"Usuario '{username}' creado exitosamente.")

if __name__ == "__main__":
    create_admin()
