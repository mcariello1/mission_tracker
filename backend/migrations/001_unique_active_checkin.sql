
-- Prevent duplicate active check-ins for the same
-- user and mission.
--
-- Historical sessions remain unrestricted because
-- the index only applies to active sessions.

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_mission_checkin
ON mission_participation (mission_id, user_id)
WHERE checked_out_at IS NULL;
