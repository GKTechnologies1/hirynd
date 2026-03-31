from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("SELECT id, user_id FROM candidates")
    rows = cursor.fetchall()
    print("Candidates:", rows)
    
    # check structure
    cursor.execute("PRAGMA table_info(candidates)")
    cols = cursor.fetchall()
    print("Cols:", cols)
