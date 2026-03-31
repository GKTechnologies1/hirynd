from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("DELETE FROM candidates WHERE user_id IS NULL")
    print(f"Deleted {cursor.rowcount} orphaned records from candidates.")
