import psycopg2


def get_connection():
    return psycopg2.connect(
        dbname="mission_tracker",
        user="michaelcariello",
        host="localhost",
        port="5432"
    )