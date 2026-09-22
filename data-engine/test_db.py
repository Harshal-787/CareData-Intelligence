import psycopg2
import json

try:
    conn = psycopg2.connect(
        dbname="caredata",
        user="postgres",
        password="password", # Try password since postgres didn't work
        host="localhost",
        port="5440"
    )
    cur = conn.cursor()
    cur.execute("SELECT profiling_json FROM quality_reports WHERE dataset_id = 'ds-demo-101'")
    row = cur.fetchone()
    if row:
        print("Found:", row[0][:200] if len(row[0]) > 200 else row[0])
    else:
        print("Not found")
    conn.close()
except Exception as e:
    print("Error:", e)
