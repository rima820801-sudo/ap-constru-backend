import sqlite3
import os

db_path = os.path.join("backend", "data.sqlite3")
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
c = conn.cursor()

print(f"Migrating database at {db_path}...")

fields = [
    ('matriz_insumo', 'precio_custom', 'NUMERIC(12, 4)'),
    ('matriz_insumo', 'unidad_custom', 'VARCHAR(50)'),
    ('matriz_insumo', 'rendimiento_jornada', 'NUMERIC(10, 4)'),
    ('matriz_insumo', 'factor_uso', 'NUMERIC(10, 4)'),
]

for table, column, type in fields:
    try:
        c.execute(f'ALTER TABLE {table} ADD COLUMN {column} {type}')
        print(f"Added {column} to {table}")
    except sqlite3.OperationalError:
        print(f"Column {column} in {table} already exists or error.")

conn.commit()
conn.close()
print("Migration complete.")
