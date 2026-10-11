import os
import psycopg2


def get_connection():
    database_name = os.getenv("DB_NAME", "mission_tracker")

    return psycopg2.connect(
        dbname=database_name,
        user="michaelcariello",
        host="localhost",
        port="5432"
    )