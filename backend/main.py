from psycopg2.extras import RealDictCursor
from fastapi.middleware.cors import CORSMiddleware
from backend.database import get_connection
from fastapi import FastAPI

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/users")
def get_users():
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    cursor.execute("SELECT * FROM users;")
    users = cursor.fetchall()

    cursor.close()
    conn.close()

    return {"users": users}

@app.get("/missions/{mission_id}/members")
def get_mission_members(mission_id: int):
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    cursor.execute(
        """
        SELECT
            u.id,
            u.name,
            u.email,
            mp.checked_in_at,
            mp.checked_out_at
        FROM mission_participation mp
        JOIN users u
            ON mp.user_id = u.id
        WHERE mp.mission_id = %s
        ORDER BY u.name;
        """,
        (mission_id,)
    )

    members = cursor.fetchall()

    cursor.close()
    conn.close()

    return {"members": members}

@app.get("/missions/{mission_id}/hours")
def get_mission_hours(mission_id: int):
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    cursor.execute(
        """
        SELECT
            u.id,
            u.name,
            u.email,
            COUNT(mp.id) AS session_count,
            SUM(
                EXTRACT(
                    EPOCH FROM (mp.checked_out_at - mp.checked_in_at)
                )
            ) / 3600 AS total_hours
        FROM mission_participation mp
        JOIN users u
            ON mp.user_id = u.id
        WHERE mp.mission_id = %s
          AND mp.checked_out_at IS NOT NULL
        GROUP BY u.id, u.name, u.email
        ORDER BY u.name;
        """,
        (mission_id,)
    )

    hours = cursor.fetchall()

    cursor.close()
    conn.close()

    return {"hours": hours}