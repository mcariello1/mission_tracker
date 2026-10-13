from fastapi.testclient import TestClient
from backend.main import app
import pytest
from psycopg2.errors import UniqueViolation
from concurrent.futures import ThreadPoolExecutor

client = TestClient(app)


def test_health_check():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_get_teams():
    response = client.get("/teams")

    assert response.status_code == 200

    data = response.json()

    assert "teams" in data
    assert isinstance(data["teams"], list)

    for team in data["teams"]:
        assert "id" in team
        assert "name" in team
        assert "created_at" in team

from backend.database import get_connection


def test_create_team():
    # Create a team through the API
    response = client.post(
        "/teams",
        json={"name": "Automated Test Rescue Team"}
    )

    assert response.status_code == 201

    data = response.json()

    assert data["message"] == "Team created successfully"
    assert data["team"]["name"] == "Automated Test Rescue Team"

    team_id = data["team"]["id"]

    # Verify the team was saved in PostgreSQL
    conn = get_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT name FROM teams WHERE id = %s",
                (team_id,)
            )

            result = cursor.fetchone()

            assert result is not None
            assert result[0] == "Automated Test Rescue Team"

    finally:
        conn.close()

        # Clean up the test team, even if an assertion fails
        cleanup_conn = get_connection()

        try:
            with cleanup_conn:
                with cleanup_conn.cursor() as cursor:
                    cursor.execute(
                        "DELETE FROM teams WHERE id = %s",
                        (team_id,)
                    )
        finally:
            cleanup_conn.close()

def test_assign_member_to_nonexistent_team():
    response = client.post(
        "/teams/999999/members",
        json={"user_id": 1}
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Team not found"

def test_get_team_members_for_new_team(test_team):
    response = client.get("/missions")

    assert response.status_code == 200

    conn = get_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT name FROM teams WHERE id = %s",
                (test_team,)
            )

            result = cursor.fetchone()

            assert result is not None
            assert result[0] == "Temporary Test Team"
    finally:
        conn.close()

def test_assign_user_to_team(test_team, test_user):
    response = client.post(
        f"/teams/{test_team}/members",
        json={"user_id": test_user}
    )

    assert response.status_code == 201

    data = response.json()

    assert data["message"] == "Team member added successfully"
    assert data["membership"]["team_id"] == test_team
    assert data["membership"]["user_id"] == test_user

def test_duplicate_team_membership(test_team, test_user):
    # First assignment should succeed
    first_response = client.post(
        f"/teams/{test_team}/members",
        json={"user_id": test_user}
    )

    assert first_response.status_code == 201

    # Second assignment should be rejected
    second_response = client.post(
        f"/teams/{test_team}/members",
        json={"user_id": test_user}
    )

    assert second_response.status_code == 409

    assert second_response.json()["detail"] == (
        "User already belongs to this team"
    )

def test_mission_check_in(test_mission, test_team, test_user):
    # Assign the user to the mission's team
    assignment_response = client.post(
        f"/teams/{test_team}/members",
        json={"user_id": test_user}
    )

    assert assignment_response.status_code == 201

    # Check the user into the mission
    response = client.post(
        f"/missions/{test_mission}/check-in",
        json={"user_id": test_user}
    )

    assert response.status_code == 201

    # Verify the participation record exists
    conn = get_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT checked_in_at, checked_out_at
                FROM mission_participation
                WHERE mission_id = %s
                  AND user_id = %s;
                """,
                (test_mission, test_user)
            )

            result = cursor.fetchone()

            assert result is not None
            assert result[0] is not None
            assert result[1] is None

    finally:
        conn.close()

def test_duplicate_mission_check_in(test_mission, test_team, test_user):
    # Assign the user to the mission's team
    assignment_response = client.post(
        f"/teams/{test_team}/members",
        json={"user_id": test_user}
    )

    assert assignment_response.status_code == 201

    # First check-in should succeed
    first_response = client.post(
        f"/missions/{test_mission}/check-in",
        json={"user_id": test_user}
    )

    assert first_response.status_code == 201

    # Second check-in should be rejected
    second_response = client.post(
        f"/missions/{test_mission}/check-in",
        json={"user_id": test_user}
    )

    assert second_response.status_code == 409

    # Verify only one active session exists
    conn = get_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT COUNT(*)
                FROM mission_participation
                WHERE mission_id = %s
                  AND user_id = %s
                  AND checked_out_at IS NULL;
                """,
                (test_mission, test_user)
            )

            active_sessions = cursor.fetchone()[0]

            assert active_sessions == 1

    finally:
        conn.close()

def test_database_prevents_duplicate_active_checkins(test_mission, test_user):
    conn = get_connection()

    try:
        with pytest.raises(UniqueViolation):
            with conn:
                with conn.cursor() as cursor:
                    # First active check-in succeeds
                    cursor.execute(
                        """
                        INSERT INTO mission_participation (mission_id, user_id)
                        VALUES (%s, %s);
                        """,
                        (test_mission, test_user)
                    )

                    # Second active check-in must fail
                    cursor.execute(
                        """
                        INSERT INTO mission_participation (mission_id, user_id)
                        VALUES (%s, %s);
                        """,
                        (test_mission, test_user)
                    )

    finally:
        conn.close()

def test_mission_check_out(test_mission, test_team, test_user):
    # Assign the user to the mission's team
    assignment_response = client.post(
        f"/teams/{test_team}/members",
        json={"user_id": test_user}
    )

    assert assignment_response.status_code == 201

    # Check the user into the mission
    check_in_response = client.post(
        f"/missions/{test_mission}/check-in",
        json={"user_id": test_user}
    )

    assert check_in_response.status_code == 201

    # Check the user out of the mission
    check_out_response = client.post(
        f"/missions/{test_mission}/check-out",
        json={"user_id": test_user}
    )

    assert check_out_response.status_code == 200

    # Verify the session was closed in PostgreSQL
    conn = get_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT checked_in_at, checked_out_at
                FROM mission_participation
                WHERE mission_id = %s
                  AND user_id = %s;
                """,
                (test_mission, test_user)
            )

            result = cursor.fetchone()

            assert result is not None

            checked_in_at, checked_out_at = result

            assert checked_in_at is not None
            assert checked_out_at is not None

            # Check-out cannot happen before check-in
            assert checked_out_at >= checked_in_at

    finally:
        conn.close()

def test_check_out_without_check_in(test_mission, test_team, test_user):
    # Assign the user to the mission's team
    assignment_response = client.post(
        f"/teams/{test_team}/members",
        json={"user_id": test_user}
    )

    assert assignment_response.status_code == 201

    # Attempt to check out without checking in
    response = client.post(
        f"/missions/{test_mission}/check-out",
        json={"user_id": test_user}
    )

    # The API should reject this request
    assert response.status_code == 404

    # Verify no participation record was created
    conn = get_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT COUNT(*)
                FROM mission_participation
                WHERE mission_id = %s
                  AND user_id = %s;
                """,
                (test_mission, test_user)
            )

            count = cursor.fetchone()[0]

            assert count == 0

    finally:
        conn.close()

def test_mission_hours_calculation(test_mission, test_team, test_user):
    # Assign the user to the mission's team
    response = client.post(
        f"/teams/{test_team}/members",
        json={"user_id": test_user}
    )

    assert response.status_code == 201

    # Insert two completed sessions with known durations
    conn = get_connection()

    try:
        with conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO mission_participation
                        (mission_id, user_id, checked_in_at, checked_out_at)
                    VALUES
                        (
                            %s, %s,
                            TIMESTAMPTZ '2026-10-01 08:00:00+00',
                            TIMESTAMPTZ '2026-10-01 10:00:00+00'
                        ),
                        (
                            %s, %s,
                            TIMESTAMPTZ '2026-10-02 09:00:00+00',
                            TIMESTAMPTZ '2026-10-02 12:30:00+00'
                        );
                    """,
                    (
                        test_mission, test_user,
                        test_mission, test_user
                    )
                )
    finally:
        conn.close()

    # Request calculated hours through FastAPI
    response = client.get(
        f"/missions/{test_mission}/hours"
    )

    assert response.status_code == 200

    data = response.json()
    hours = data["hours"]

    # Find the temporary user's hours
    user_hours = next(
        member for member in hours
        if member["id"] == test_user
    )

    assert user_hours["session_count"] == 2
    assert abs(float(user_hours["total_hours"]) - 5.5) < 0.001


def test_active_session_excluded_from_hours(test_mission, test_team, test_user):
    # Assign the user to the mission's team
    response = client.post(
        f"/teams/{test_team}/members",
        json={"user_id": test_user}
    )

    assert response.status_code == 201

    # Insert one completed session and one active session
    conn = get_connection()

    try:
        with conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO mission_participation
                        (mission_id, user_id, checked_in_at, checked_out_at)
                    VALUES
                        (
                            %s, %s,
                            TIMESTAMPTZ '2026-10-01 08:00:00+00',
                            TIMESTAMPTZ '2026-10-01 10:00:00+00'
                        ),
                        (
                            %s, %s,
                            TIMESTAMPTZ '2026-10-02 09:00:00+00',
                            NULL
                        );
                    """,
                    (
                        test_mission, test_user,
                        test_mission, test_user
                    )
                )
    finally:
        conn.close()

    # Retrieve calculated hours
    response = client.get(
        f"/missions/{test_mission}/hours"
    )

    assert response.status_code == 200

    data = response.json()

    user_hours = next(
        member for member in data["hours"]
        if member["id"] == test_user
    )

    # Only the completed session should count
    assert user_hours["session_count"] == 1
    assert abs(float(user_hours["total_hours"]) - 2.0) < 0.001



def test_concurrent_mission_checkins(test_mission, test_team, test_user):
    # Assign the user to the mission's team
    response = client.post(
        f"/teams/{test_team}/members",
        json={"user_id": test_user}
    )

    assert response.status_code == 201

    # Each worker sends a check-in request
    def check_in():
        return client.post(
            f"/missions/{test_mission}/check-in",
            json={"user_id": test_user}
        )

    # Send two requests concurrently
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(check_in) for _ in range(2)]
        responses = [future.result() for future in futures]

    # One request should succeed, the other should conflict
    status_codes = sorted(response.status_code for response in responses)

    assert status_codes == [201, 409]

    # Verify PostgreSQL contains exactly one active session
    conn = get_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT COUNT(*)
                FROM mission_participation
                WHERE mission_id = %s
                  AND user_id = %s
                  AND checked_out_at IS NULL;
                """,
                (test_mission, test_user)
            )

            assert cursor.fetchone()[0] == 1

    finally:
        conn.close()


def test_cannot_check_in_before_mission_starts(test_mission, test_user):
    # Put the test mission back into Not Started status
    conn = get_connection()

    try:
        with conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE missions
                    SET started_at = NULL
                    WHERE id = %s;
                    """,
                    (test_mission,)
                )
    finally:
        conn.close()

    # Attempt to check in before the mission starts
    response = client.post(
        f"/missions/{test_mission}/check-in",
        json={"user_id": test_user}
    )

    assert response.status_code == 409
    assert response.json()["detail"] == (
        "Cannot check in unless mission is active"
    )


def test_cannot_complete_mission_with_active_responders(
    test_mission, test_team, test_user
):
    # Add the responder to the mission's team
    assignment = client.post(
        f"/teams/{test_team}/members",
        json={"user_id": test_user}
    )
    assert assignment.status_code == 201

    # Check the responder into the active mission
    check_in = client.post(
        f"/missions/{test_mission}/check-in",
        json={"user_id": test_user}
    )
    assert check_in.status_code == 201

    # Attempt to complete the mission
    response = client.post(
        f"/missions/{test_mission}/complete"
    )

    # Completion must be rejected
    assert response.status_code == 409
    assert response.json()["detail"] == (
        "Cannot complete mission while responders are checked in"
    )


def test_complete_mission_after_responder_checks_out(
    test_mission, test_team, test_user
):
    # Assign responder to the mission's team
    assignment = client.post(
        f"/teams/{test_team}/members",
        json={"user_id": test_user}
    )
    assert assignment.status_code == 201

    # Check in
    check_in = client.post(
        f"/missions/{test_mission}/check-in",
        json={"user_id": test_user}
    )
    assert check_in.status_code == 201

    # Check out
    check_out = client.post(
        f"/missions/{test_mission}/check-out",
        json={"user_id": test_user}
    )
    assert check_out.status_code == 200

    # Complete the mission
    completion = client.post(
        f"/missions/{test_mission}/complete"
    )
    assert completion.status_code == 200

    # Verify the mission is completed
    mission = completion.json()["mission"]
    assert mission["ended_at"] is not None


def test_cannot_check_in_after_mission_completed(
    test_mission, test_team, test_user
):
    # Assign responder to the mission's team
    assignment = client.post(
        f"/teams/{test_team}/members",
        json={"user_id": test_user}
    )
    assert assignment.status_code == 201

    # Complete the active mission
    completion = client.post(
        f"/missions/{test_mission}/complete"
    )
    assert completion.status_code == 200

    # Attempt to check in after completion
    response = client.post(
        f"/missions/{test_mission}/check-in",
        json={"user_id": test_user}
    )

    # Completed missions must reject check-ins
    assert response.status_code == 409
    assert response.json()["detail"] == (
        "Cannot check in unless mission is active"
    )


def test_start_mission_creates_activity_event(test_mission):
    # Reset the mission to Not Started
    conn = get_connection()

    try:
        with conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "UPDATE missions SET started_at = NULL WHERE id = %s",
                    (test_mission,)
                )
    finally:
        conn.close()

    # Start the mission through the API
    response = client.post(
        f"/missions/{test_mission}/start"
    )

    assert response.status_code == 200

    # Retrieve the mission activity
    activity_response = client.get(
        f"/missions/{test_mission}/activity"
    )

    assert activity_response.status_code == 200

    events = activity_response.json()["events"]

    # Starting the mission should create exactly one event
    assert len(events) == 1
    assert events[0]["event_type"] == "mission_started"
    assert events[0]["mission_id"] == test_mission
    assert events[0]["user_id"] is None


def test_complete_mission_creates_activity_event(test_mission):
    # Complete an active mission through the API
    response = client.post(
        f"/missions/{test_mission}/complete"
    )

    assert response.status_code == 200

    # Retrieve the mission activity
    activity_response = client.get(
        f"/missions/{test_mission}/activity"
    )

    assert activity_response.status_code == 200

    events = activity_response.json()["events"]

    # Completing the mission should create exactly one event
    assert len(events) == 1
    assert events[0]["event_type"] == "mission_completed"
    assert events[0]["mission_id"] == test_mission
    assert events[0]["user_id"] is None



def test_check_in_creates_activity_event(
    test_mission, test_team, test_user
):
    # Assign responder to the mission's team
    assignment = client.post(
        f"/teams/{test_team}/members",
        json={"user_id": test_user}
    )

    assert assignment.status_code == 201

    # Check the responder into the mission
    response = client.post(
        f"/missions/{test_mission}/check-in",
        json={"user_id": test_user}
    )

    assert response.status_code == 201

    # Retrieve activity history
    activity_response = client.get(
        f"/missions/{test_mission}/activity"
    )

    assert activity_response.status_code == 200

    events = activity_response.json()["events"]

    assert len(events) == 1
    assert events[0]["event_type"] == "responder_checked_in"
    assert events[0]["mission_id"] == test_mission
    assert events[0]["user_id"] == test_user
    assert events[0]["responder_name"] == "Test Rescue User"



def test_check_out_creates_activity_event(
    test_mission, test_team, test_user
):
    # Assign responder to the mission's team
    assignment = client.post(
        f"/teams/{test_team}/members",
        json={"user_id": test_user}
    )
    assert assignment.status_code == 201

    # Check the responder in
    check_in = client.post(
        f"/missions/{test_mission}/check-in",
        json={"user_id": test_user}
    )
    assert check_in.status_code == 201

    # Check the responder out
    check_out = client.post(
        f"/missions/{test_mission}/check-out",
        json={"user_id": test_user}
    )
    assert check_out.status_code == 200

    # Retrieve the Activity Log
    activity_response = client.get(
        f"/missions/{test_mission}/activity"
    )
    assert activity_response.status_code == 200

    events = activity_response.json()["events"]

    # Verify both events exist in chronological order
    assert len(events) == 2

    assert events[0]["event_type"] == "responder_checked_in"
    assert events[1]["event_type"] == "responder_checked_out"

    assert events[1]["mission_id"] == test_mission
    assert events[1]["user_id"] == test_user
    assert events[1]["responder_name"] == "Test Rescue User"



def test_duplicate_check_in_does_not_create_activity(
    test_mission, test_team, test_user
):
    # Assign responder to the mission's team
    assignment = client.post(
        f"/teams/{test_team}/members",
        json={"user_id": test_user}
    )
    assert assignment.status_code == 201

    # First check-in should succeed
    first_response = client.post(
        f"/missions/{test_mission}/check-in",
        json={"user_id": test_user}
    )
    assert first_response.status_code == 201

    # Duplicate check-in should be rejected
    duplicate_response = client.post(
        f"/missions/{test_mission}/check-in",
        json={"user_id": test_user}
    )
    assert duplicate_response.status_code == 409

    # Verify only the successful check-in was logged
    activity_response = client.get(
        f"/missions/{test_mission}/activity"
    )
    assert activity_response.status_code == 200

    events = activity_response.json()["events"]

    assert len(events) == 1
    assert events[0]["event_type"] == "responder_checked_in"
    assert events[0]["user_id"] == test_user


def test_failed_completion_does_not_create_activity(
    test_mission, test_team, test_user
):
    # Assign responder to the mission's team
    assignment = client.post(
        f"/teams/{test_team}/members",
        json={"user_id": test_user}
    )
    assert assignment.status_code == 201

    # Check the responder in
    check_in = client.post(
        f"/missions/{test_mission}/check-in",
        json={"user_id": test_user}
    )
    assert check_in.status_code == 201

    # Attempt to complete the mission
    completion = client.post(
        f"/missions/{test_mission}/complete"
    )
    assert completion.status_code == 409

    # Retrieve the Activity Log
    activity_response = client.get(
        f"/missions/{test_mission}/activity"
    )
    assert activity_response.status_code == 200

    events = activity_response.json()["events"]

    # Only the successful check-in should be recorded
    assert len(events) == 1
    assert events[0]["event_type"] == "responder_checked_in"

    # No mission completion event should exist
    assert not any(
        event["event_type"] == "mission_completed"
        for event in events
    )
