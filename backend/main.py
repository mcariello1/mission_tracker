from psycopg2.extras import RealDictCursor
from fastapi.middleware.cors import CORSMiddleware
from backend.database import get_connection
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CheckInRequest(BaseModel):
    user_id: int

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

@app.post("/missions/{mission_id}/check-in", status_code=201)
def check_in(mission_id: int, request: CheckInRequest):
    conn = get_connection()

    try:
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:

                # Verify the user belongs to the mission's team
                cursor.execute(
                    """
                    SELECT 1
                    FROM missions m
                    JOIN team_members tm
                        ON tm.team_id = m.team_id
                    WHERE m.id = %s
                      AND tm.user_id = %s;
                    """,
                    (mission_id, request.user_id)
                )

                if cursor.fetchone() is None:
                    raise HTTPException(
                        status_code=404,
                        detail="Mission or eligible team member not found"
                    )

                # Prevent duplicate active check-ins
                cursor.execute(
                    """
                    SELECT id
                    FROM mission_participation
                    WHERE mission_id = %s
                      AND user_id = %s
                      AND checked_out_at IS NULL;
                    """,
                    (mission_id, request.user_id)
                )

                if cursor.fetchone():
                    raise HTTPException(
                        status_code=409,
                        detail="User is already checked in"
                    )

                # Create the participation session
                cursor.execute(
                    """
                    INSERT INTO mission_participation (
                        mission_id,
                        user_id
                    )
                    VALUES (%s, %s)
                    RETURNING
                        id,
                        mission_id,
                        user_id,
                        checked_in_at;
                    """,
                    (mission_id, request.user_id)
                )

                session = dict(cursor.fetchone())

        return {"message": "Check-in successful", "session": session}

    finally:
        conn.close()

@app.post("/missions/{mission_id}/check-out")
def check_out(mission_id: int, request: CheckInRequest):
    conn = get_connection()

    try:
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    UPDATE mission_participation
                    SET checked_out_at = NOW()
                    WHERE mission_id = %s
                      AND user_id = %s
                      AND checked_out_at IS NULL
                    RETURNING
                        id,
                        mission_id,
                        user_id,
                        checked_in_at,
                        checked_out_at;
                    """,
                    (mission_id, request.user_id)
                )

                session = cursor.fetchone()

                if session is None:
                    raise HTTPException(
                        status_code=404,
                        detail="No active check-in found"
                    )

        return {
            "message": "Check-out successful",
            "session": dict(session)
        }

    finally:
        conn.close()

@app.get("/missions")
def get_missions():
    conn = get_connection()

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT
                    m.id,
                    m.name,
                    m.location,
                    m.team_id,
                    t.name AS team_name,
                    m.started_at,
                    m.ended_at
                FROM missions m
                JOIN teams t ON m.team_id = t.id
                ORDER BY m.id;
                """
            )

            missions = cursor.fetchall()

        return {"missions": missions}

    finally:
        conn.close()

class CreateMissionRequest(BaseModel):
    name: str
    location: str
    team_id: int


@app.post("/missions", status_code=201)
def create_mission(request: CreateMissionRequest):
    conn = get_connection()

    try:
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:

                cursor.execute(
                    "SELECT id FROM teams WHERE id = %s",
                    (request.team_id,)
                )

                if cursor.fetchone() is None:
                    raise HTTPException(
                        status_code=404,
                        detail="Team not found"
                    )

                cursor.execute(
                    """
                    INSERT INTO missions (name, location, team_id)
                    VALUES (%s, %s, %s)
                    RETURNING id, name, location, team_id, created_at;
                    """,
                    (request.name, request.location, request.team_id)
                )

                mission = dict(cursor.fetchone())

        return {
            "message": "Mission created successfully",
            "mission": mission
        }

    finally:
        conn.close()

@app.get("/missions/{mission_id}/team")
def get_mission_team(mission_id: int):
    conn = get_connection()

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT
                    u.id,
                    u.name,
                    u.email
                FROM missions m
                JOIN team_members tm
                    ON tm.team_id = m.team_id
                JOIN users u
                    ON u.id = tm.user_id
                WHERE m.id = %s
                ORDER BY u.name;
                """,
                (mission_id,)
            )

            members = cursor.fetchall()

        return {"members": members}

    finally:
        conn.close()