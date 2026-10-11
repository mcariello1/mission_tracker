import os

# Configure the test database before importing the application
os.environ["DB_NAME"] = "mission_tracker_test"

import pytest
from backend.database import get_connection


@pytest.fixture(scope="session", autouse=True)
def verify_test_database():
    conn = get_connection()

    try:
        database_name = conn.info.dbname

        if database_name != "mission_tracker_test":
            pytest.exit(
                f"Unsafe database connection: {database_name}"
            )
    finally:
        conn.close()

@pytest.fixture
def test_team():
    # Create a team for the test
    conn = get_connection()

    try:
        if conn.info.dbname != "mission_tracker_test":
            raise RuntimeError("Refusing to modify a non-test database")

        with conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO teams (name)
                    VALUES (%s)
                    RETURNING id;
                    """,
                    ("Temporary Test Team",)
                )

                team_id = cursor.fetchone()[0]
    finally:
        conn.close()

    # Provide the team ID to the test
    try:
        yield team_id

    finally:
        # Automatically clean up after the test
        cleanup_conn = get_connection()

        try:
            if cleanup_conn.info.dbname != "mission_tracker_test":
                raise RuntimeError("Refusing to clean up a non-test database")

            with cleanup_conn:
                with cleanup_conn.cursor() as cursor:
                    cursor.execute(
                        "DELETE FROM teams WHERE id = %s",
                        (team_id,)
                    )
        finally:
            cleanup_conn.close()
    
@pytest.fixture
def test_user():
    conn = get_connection()

    try:
        if conn.info.dbname != "mission_tracker_test":
            raise RuntimeError("Refusing to modify a non-test database")

        with conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO users (name, email)
                    VALUES (%s, %s)
                    RETURNING id;
                    """,
                    ("Test Rescue User", "test-rescue@example.com")
                )

                user_id = cursor.fetchone()[0]
    finally:
        conn.close()

    try:
        yield user_id

    finally:
        cleanup_conn = get_connection()

        try:
            if cleanup_conn.info.dbname != "mission_tracker_test":
                raise RuntimeError("Refusing to clean up a non-test database")

            with cleanup_conn:
                with cleanup_conn.cursor() as cursor:
                    cursor.execute(
                        "DELETE FROM team_members WHERE user_id = %s",
                        (user_id,)
                    )

                    cursor.execute(
                        "DELETE FROM users WHERE id = %s",
                        (user_id,)
                    )
        finally:
            cleanup_conn.close()

@pytest.fixture
def test_mission(test_team):
    conn = get_connection()

    try:
        if conn.info.dbname != "mission_tracker_test":
            raise RuntimeError("Refusing to modify a non-test database")

        with conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO missions (name, location, team_id)
                    VALUES (%s, %s, %s)
                    RETURNING id;
                    """,
                    (
                        "Automated Test Mission",
                        "Donner Summit",
                        test_team
                    )
                )

                mission_id = cursor.fetchone()[0]
    finally:
        conn.close()

    try:
        yield mission_id

    finally:
        cleanup_conn = get_connection()

        try:
            if cleanup_conn.info.dbname != "mission_tracker_test":
                raise RuntimeError("Refusing to modify a non-test database")

            with cleanup_conn:
                with cleanup_conn.cursor() as cursor:
                    # Remove participation records first
                    cursor.execute(
                        "DELETE FROM mission_participation WHERE mission_id = %s",
                        (mission_id,)
                    )

                    cursor.execute(
                        "DELETE FROM missions WHERE id = %s",
                        (mission_id,)
                    )
        finally:
            cleanup_conn.close()