import os

import psycopg2


def get_connection():
    database_name = os.getenv("DB_NAME", "mission_tracker")

    return psycopg2.connect(
        dbname=database_name,
        user=os.getenv("DB_USER", "michaelcariello"),
        password=os.getenv("DB_PASSWORD") or None,
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
    )
