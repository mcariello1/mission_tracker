import { useState } from 'react'

export default function MissionHistory({
  missions,
  selectedMissionId,
  onSelectMission,
}) {
  const [searchTerm, setSearchTerm] = useState('')

  const [statusFilter, setStatusFilter] = useState('All')

  function getMissionStatus(mission) {
    if (mission.ended_at !== null) {
      return 'Completed'
    }

    if (mission.started_at !== null) {
      return 'Active'
    }

    return 'Not Started'
  }

  const filteredMissions = missions.filter((mission) => {
    const search = searchTerm.toLowerCase().trim()

    const matchesSearch =
      mission.name.toLowerCase().includes(search) ||
      mission.location.toLowerCase().includes(search)

    const matchesStatus =
      statusFilter === 'All' || getMissionStatus(mission) === statusFilter

    return matchesSearch && matchesStatus
  })

  const notStartedMissions = filteredMissions.filter(
    (mission) => getMissionStatus(mission) === 'Not Started',
  )

  const activeMissions = filteredMissions.filter(
    (mission) => getMissionStatus(mission) === 'Active',
  )

  const completedMissions = filteredMissions.filter(
    (mission) => getMissionStatus(mission) === 'Completed',
  )

  function renderMission(mission) {
    return (
      <div
        key={mission.id}
        className={`history-mission ${
          getMissionStatus(mission) === 'Active'
            ? 'history-active'
            : getMissionStatus(mission) === 'Completed'
              ? 'history-completed'
              : 'history-not-started'
        }`}
        role="button"
        tabIndex={0}
        aria-pressed={selectedMissionId === mission.id}
        onClick={() => onSelectMission(mission.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelectMission(mission.id)
          }
        }}
      >
        <h3>{mission.name}</h3>

        <p>Location: {mission.location}</p>
        <p>Team: {mission.team_name}</p>
        <p>
          Started:{' '}
          {mission.started_at
            ? new Date(mission.started_at).toLocaleString()
            : 'Not started'}
        </p>
        <p>Status: {getMissionStatus(mission)}</p>
      </div>
    )
  }

  return (
    <section className="mission-history">
      <h2>Mission History</h2>

      <input
        type="text"
        placeholder="Search missions by name or location..."
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        aria-label="Search missions"
      />

      <select
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value)}
        aria-label="Filter missions by status"
      >
        <option value="All">All Missions</option>
        <option value="Not Started">Not Started</option>
        <option value="Active">Active</option>
        <option value="Completed">Completed</option>
      </select>

      {searchTerm !== '' && (
        <button type="button" onClick={() => setSearchTerm('')}>
          Clear Search
        </button>
      )}

      {searchTerm.trim() !== '' && (
        <p>
          Showing {filteredMissions.length} of {missions.length} missions
        </p>
      )}

      {filteredMissions.length === 0 && searchTerm.trim() !== '' && (
        <p>No missions found matching "{searchTerm}".</p>
      )}

      {(statusFilter === 'All' || statusFilter === 'Not Started') && (
        <>
          <h3>Not Started ({notStartedMissions.length})</h3>
          {notStartedMissions.length === 0 ? (
            <p>No pending missions.</p>
          ) : (
            notStartedMissions.map(renderMission)
          )}
        </>
      )}

      {(statusFilter === 'All' || statusFilter === 'Active') && (
        <>
          <h3 id="active-missions">
            Active Missions ({activeMissions.length})
          </h3>
          {activeMissions.length === 0 ? (
            <p>No active missions.</p>
          ) : (
            activeMissions.map(renderMission)
          )}
        </>
      )}

      {(statusFilter === 'All' || statusFilter === 'Completed') && (
        <>
          <h3 id="completed-missions">
            Completed Missions ({completedMissions.length})
          </h3>
          {completedMissions.length === 0 ? (
            <p>No completed missions yet.</p>
          ) : (
            completedMissions.map(renderMission)
          )}
        </>
      )}
    </section>
  )
}
