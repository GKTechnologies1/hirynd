import sqlite3
import os

db_path = 'd:/Clients/hirynd/django_backend/db.sqlite3'
if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def add_column(table, column, type):
    try:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {type}")
        print(f"Added {column} to {table}")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print(f"Column {column} already exists in {table}")
        else:
            print(f"Error adding {column} to {table}: {e}")

add_column('candidates', 'resume_file', 'varchar(100)')
add_column('candidates', 'services', 'json')
add_column('interested_candidates', 'resume_file', 'varchar(100)')
add_column('interested_candidates', 'selected_services', 'json')

conn.commit()
conn.close()
print("Done")
