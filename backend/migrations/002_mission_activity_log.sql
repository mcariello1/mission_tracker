
-- Record important events during a mission.
-- Each event belongs to a mission and has a timestamp.

CREATE TABLE IF NOT EXISTS mission_activity_log (
    id SERIAL PRIMARY KEY,
    mission_id BIGINT NOT NULL REFERENCES missions(id),
    user_id BIGINT REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mission_activity_log_mission
ON mission_activity_log (mission_id, created_at DESC);
