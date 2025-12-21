import sqlite3
import os

# Determinar la ruta de la base de datos (ajustada para Render)
# Config.py usa: sqlite:///{os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data.sqlite3')}
# Si este script está en la raíz, backend/data.sqlite3 es el objetivo.
db_path = "data.sqlite3"

if not os.path.exists(db_path):
    print(f"Base de datos no encontrada en {db_path}. No hay nada que migrar.")
    exit(0)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print(f"Migrando base de datos en: {db_path}")

# Lista de columnas a agregar a la tabla 'users'
migrations = [
    ('ALTER TABLE users ADD COLUMN is_premium BOOLEAN DEFAULT 0', "Columna 'is_premium'"),
    ('ALTER TABLE users ADD COLUMN trial_ends_at DATETIME', "Columna 'trial_ends_at'")
]

for query, description in migrations:
    try:
        cursor.execute(query)
        print(f"✅ {description} agregada con éxito.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print(f"ℹ️ {description} ya existe.")
        else:
            print(f"❌ Error agregando {description}: {e}")

conn.commit()
conn.close()
print("Migración finalizada.")
