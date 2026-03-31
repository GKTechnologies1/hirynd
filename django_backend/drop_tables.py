import sqlite3
import os

try:
    conn = sqlite3.connect('db.sqlite3')
    c = conn.cursor()
    c.execute("PRAGMA writable_schema = 1")
    c.execute("DELETE FROM sqlite_master WHERE type in ('table', 'index', 'trigger')")
    c.execute("PRAGMA writable_schema = 0")
    conn.commit()
    c.execute("VACUUM")
    conn.commit()
    conn.close()
    print("Database purged successfully.")
except Exception as e:
    print("Error:", e)
