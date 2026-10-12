
export default function MissionHistory({
  missions,
  selectedMissionId,
  onSelectMission
}) {

  function getMissionStatus(mission) {
  if (mission.ended_at !== null) {
    return "Completed"
  }

  if (mission.started_at !== null) {
    return "Active"
  }

  return "Not Started"
}
  const notStartedMissions = missions.filter(
  (mission) => getMissionStatus(mission) === "Not Started"
)

const activeMissions = missions.filter(
  (mission) => getMissionStatus(mission) === "Active"
)

const completedMissions = missions.filter(
  (mission) => getMissionStatus(mission) === "Completed"
)

  
function renderMission(mission) {
  return (
    <div
      key={mission.id}
      className={`history-mission ${
        getMissionStatus(mission) === "Active"
          ? "history-active"
          : getMissionStatus(mission) === "Completed"
            ? "history-completed"
            : "history-not-started"
      }`}
      role="button"
      tabIndex={0}
      aria-pressed={selectedMissionId === mission.id}
      onClick={() => onSelectMission(mission.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onSelectMission(mission.id)
        }
      }}
    >
      <h3>{mission.name}</h3>

        <p>Location: {mission.location}</p>
        <p>Team: {mission.team_name}</p>
        <p>
  Started:{" "}
  {mission.started_at
    ? new Date(mission.started_at).toLocaleString()
    : "Not started"}
</p>
        <p>Status: {getMissionStatus(mission)}</p>
      </div>
    )
  }

  return (
    <section className="mission-history">
      <h2>Mission History</h2>
      <h3>Not Started ({notStartedMissions.length})</h3>
{notStartedMissions.length === 0
  ? <p>No pending missions.</p>
  : notStartedMissions.map(renderMission)}
      <h3>Active Missions ({activeMissions.length})</h3>
      {activeMissions.length === 0
        ? <p>No active missions.</p>
        : activeMissions.map(renderMission)}

      <h3>Completed Missions ({completedMissions.length})</h3>
      {completedMissions.length === 0
        ? <p>No completed missions yet.</p>
        : completedMissions.map(renderMission)}
    </section>
  )
}
