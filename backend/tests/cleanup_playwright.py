import os
import psycopg2

# Never allow this script to run against the development database.
if os.getenv("DB_NAME") != "mission_tracker_test":
    raise RuntimeError(
        "Cleanup refused: DB_NAME must be mission_tracker_test"
    )


conn = psycopg2.connect(
    dbname="mission_tracker_test",
    user=os.getenv("DB_USER", "michaelcariello"),
    password=os.getenv("DB_PASSWORD") or None,
    host=os.getenv("DB_HOST", "localhost"),
    port=os.getenv("DB_PORT", "5432"),
)


try:
    if conn.info.dbname != "mission_tracker_test":
        raise RuntimeError("Unsafe database connection")

    with conn:
        with conn.cursor() as cursor:
            # Only target teams created by Playwright.
            cursor.execute("""
                SELECT id
                FROM teams
                WHERE name LIKE 'Playwright Team %'
            """)
            team_ids = [row[0] for row in cursor.fetchall()]

            if not team_ids:
                print("No Playwright teams to clean up.")
            else:
                cursor.execute("""
                    DELETE FROM mission_activity_log
                    WHERE mission_id IN (
                        SELECT id FROM missions
                        WHERE team_id = ANY(%s)
                    )
                """, (team_ids,))

                cursor.execute("""
                    DELETE FROM mission_participation
                    WHERE mission_id IN (
                        SELECT id FROM missions
                        WHERE team_id = ANY(%s)
                    )
                """, (team_ids,))

                cursor.execute("""
                    DELETE FROM missions
                    WHERE team_id = ANY(%s)
                """, (team_ids,))

                cursor.execute("""
                    DELETE FROM team_members
                    WHERE team_id = ANY(%s)
                """, (team_ids,))

                cursor.execute("""
                    DELETE FROM teams
                    WHERE id = ANY(%s)
                """, (team_ids,))

                print(f"Cleaned up {len(team_ids)} Playwright teams.")

finally:
    conn.close()