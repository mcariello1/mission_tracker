import { useState, useEffect } from 'react'
import './App.css'
import MissionHistory from './components/MissionHistory'
import MissionMap from './components/MissionMap'
import { API_BASE_URL } from './config'


function App() {
  const [users, setUsers] = useState([])
  const [missions, setMissions] = useState([])
  const [teams, setTeams] = useState([])
  const [assignmentTeamId, setAssignmentTeamId] = useState("")
  const [assignmentUserId, setAssignmentUserId] = useState("")
  const [assigningMember, setAssigningMember] = useState(false)
  const [newTeamName, setNewTeamName] = useState("")
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [selectedMissionId, setSelectedMissionId] = useState(null)
  const [missionMembers, setMissionMembers] = useState([])
  const [missionHours, setMissionHours] = useState([])
  const [missionActivity, setMissionActivity] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [newMissionName, setNewMissionName] = useState("")
  const [newMissionLocation, setNewMissionLocation] = useState("")
  const [newMissionTeamId, setNewMissionTeamId] = useState("")
  const [creatingMission, setCreatingMission] = useState(false)
  const [notification, setNotification] = useState(null)

  const [updatingResponder, setUpdatingResponder] = useState(null)



  useEffect(() => {
  // Load teams
  fetch(`${API_BASE_URL}/teams`)
  .then((response) => {
    if (!response.ok) {
      throw new Error("Failed to load teams")
    }
    return response.json()
  })
  .then((data) => setTeams(data.teams))
  .catch((error) => {
    console.error("Error fetching teams:", error)
  })
  // Load missions
  fetch(`${API_BASE_URL}/missions`)
    .then((response) => response.json())
    .then((data) => {
      setMissions(data.missions)

      
if (data.missions.length > 0) {
  const activeMission = data.missions.find(
    (mission) => mission.started_at && !mission.ended_at
  )

  setSelectedMissionId(
    activeMission ? activeMission.id : data.missions[0].id
  )
}

    })
    .catch((error) => {
      console.error("Error fetching missions:", error)
    })

  // Load users
  fetch(`${API_BASE_URL}/users`)
    .then((response) => response.json())
    .then((data) => setUsers(data.users))
    .catch((error) => {
      console.error("Error fetching users:", error)
    })
}, [])

// Reload mission data whenever the selected mission changes
useEffect(() => {
  if (selectedMissionId === null) return

  async function loadMissionData() {
    try {
      
const [
  membersResponse,
  hoursResponse,
  teamResponse,
  activityResponse
] = await Promise.all([
  fetch(
  `${API_BASE_URL}/missions/${selectedMissionId}/members`
),
  fetch(
    `${API_BASE_URL}/missions/${selectedMissionId}/hours`
  ),
  fetch(
    `${API_BASE_URL}/missions/${selectedMissionId}/team`
  ),
  fetch(
    `${API_BASE_URL}/missions/${selectedMissionId}/activity`
  )
])


      if (
  !membersResponse.ok ||
  !hoursResponse.ok ||
  !teamResponse.ok ||
  !activityResponse.ok
) {
        throw new Error("Failed to load mission data")
      }

      const membersData = await membersResponse.json()
      const hoursData = await hoursResponse.json()
      const teamData = await teamResponse.json()
      const activityData = await activityResponse.json()

      setMissionMembers(membersData.members)
      setMissionHours(hoursData.hours)
      setTeamMembers(teamData.members)
      setMissionActivity(activityData.events)
    } catch (error) {
      console.error("Error loading mission:", error)
    }
  }

  setMissionMembers([])
  setMissionHours([])
  setTeamMembers([])
  setMissionActivity([])
  loadMissionData()
}, [selectedMissionId])

  async function removeTeamMember(teamId, userId) {
  const confirmed = window.confirm(
    "Are you sure you want to remove this user from the team?"
  )

  if (!confirmed) return

  try {
    const response = await fetch(
      `${API_BASE_URL}/teams/${teamId}/members/${userId}`,
      {
        method: "DELETE"
      }
    )

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.detail || "Failed to remove member")
    }

    // Refresh the current mission's team members
    const teamResponse = await fetch(
      `${API_BASE_URL}/missions/${selectedMissionId}/team`
    )

    if (!teamResponse.ok) {
      throw new Error("Member removed, but refresh failed")
    }

    const teamData = await teamResponse.json()
    setTeamMembers(teamData.members)

setNotification({
  type: "success",
  message: "Team member removed successfully."
})


  
} catch (error) {
  console.error("Failed to remove member:", error)

  setNotification({
    type: "error",
    message: error.message
  })
}

}

  async function assignTeamMember(event) {
  event.preventDefault()

  if (!assignmentTeamId || !assignmentUserId) return

  setAssigningMember(true)

  try {
    const response = await fetch(
      `${API_BASE_URL}/teams/${assignmentTeamId}/members`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: Number(assignmentUserId)
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.detail || "Failed to assign team member")
    }

    
setNotification({
  type: "success",
  message: "Team member assigned successfully."
})
 

    setAssignmentUserId("")
    setAssignmentTeamId("")

    // Refresh the selected mission's team if it uses this team
    const selectedMission = missions.find(
      (mission) => mission.id === selectedMissionId
    )

    if (selectedMission?.team_id === Number(assignmentTeamId)) {
      const teamResponse = await fetch(
        `${API_BASE_URL}/missions/${selectedMissionId}/team`
      )

      if (!teamResponse.ok) {
        throw new Error("Assignment saved, but team refresh failed")
      }

      const teamData = await teamResponse.json()
      setTeamMembers(teamData.members)
    }

  
} catch (error) {
  console.error("Team assignment failed:", error)

  setNotification({
    type: "error",
    message: error.message
  })
} finally {
  setAssigningMember(false)
}

}

  async function createTeam(event) {
  event.preventDefault()

  if (!newTeamName.trim()) return

  setCreatingTeam(true)

  try {
    const response = await fetch(
      `${API_BASE_URL}/teams`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: newTeamName.trim()
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.detail || "Failed to create team")
    }

    setTeams((previousTeams) => [
      ...previousTeams,
      data.team
    ])

    setNewTeamName("")


setNotification({
  type: "success",
  message: "Team created successfully."
})

  
} catch (error) {
  console.error("Error creating team:", error)

  setNotification({
    type: "error",
    message: error.message
  })
} finally {
  setCreatingTeam(false)
}

}

  async function createMission(event) {
  event.preventDefault()

  if (
  !newMissionName.trim() ||
  !newMissionLocation.trim() ||
  !newMissionTeamId
) {
  alert("Please fill out all fields and select a team.")
  return
}

  setCreatingMission(true)

  try {
    const response = await fetch(
      `${API_BASE_URL}/missions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: newMissionName.trim(),
          location: newMissionLocation.trim(),
          team_id: Number(newMissionTeamId)
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.detail || "Failed to create mission")
    }

    const newMission = data.mission

    setMissions((previousMissions) => [
      ...previousMissions,
      newMission
    ])

    setSelectedMissionId(newMission.id)
    setNewMissionName("")
    setNewMissionLocation("")
    setNewMissionTeamId("")

setNotification({
  type: "success",
  message: "Mission created successfully."
})


  } catch (error) {
  console.error("Error creating mission:", error)

  setNotification({
    type: "error",
    message: error.message
  })
} finally {
  setCreatingMission(false)
}
}
  
async function startMission(missionId) {
  const confirmed = window.confirm(
  "Are you sure you want to start this mission?"
)

if (!confirmed) return
  try {
    const response = await fetch(
      `${API_BASE_URL}/missions/${missionId}/start`,
      { method: "POST" }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.detail || "Failed to start mission")
    }

    setMissions((previousMissions) =>
      previousMissions.map((mission) =>
        mission.id === missionId
          ? { ...mission, ...data.mission }
          : mission
      )
    )

    // Refresh activity for the selected mission
    if (selectedMissionId === missionId) {
      const activityResponse = await fetch(
        `${API_BASE_URL}/missions/${missionId}/activity`
      )

      if (!activityResponse.ok) {
        throw new Error("Failed to refresh mission activity")
      }

      const activityData = await activityResponse.json()
      setMissionActivity(activityData.events)
    }


    setNotification({
  type: "success",
  message: "Mission started successfully."
})

  
} catch (error) {
  console.error("Failed to start mission:", error)

  setNotification({
    type: "error",
    message: error.message
  })
}

}

 
async function completeMission(missionId) {
  const confirmed = window.confirm(
  "Are you sure you want to complete this mission?"
)

if (!confirmed) return
  try {
    const response = await fetch(
      `${API_BASE_URL}/missions/${missionId}/complete`,
      { method: "POST" }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.detail || "Failed to complete mission")
    }

    setMissions((previousMissions) =>
      previousMissions.map((mission) =>
        mission.id === missionId
          ? { ...mission, ...data.mission }
          : mission
      )
    )

    // Refresh activity for the selected mission
    if (selectedMissionId === missionId) {
      const activityResponse = await fetch(
        `${API_BASE_URL}/missions/${missionId}/activity`
      )

      if (!activityResponse.ok) {
        throw new Error("Failed to refresh mission activity")
      }

      const activityData = await activityResponse.json()
      setMissionActivity(activityData.events)
    }


setNotification({
  type: "success",
  message: "Mission completed successfully."
})


  } catch (error) {
  console.error("Failed to complete mission:", error)

  setNotification({
    type: "error",
    message: error.message
  })
}
}


  async function toggleStatus(id, isCheckedIn) {
  const action = isCheckedIn ? "check-out" : "check-in"
  if (isCheckedIn) {
  const confirmed = window.confirm(
    "Are you sure you want to check out this responder?"
  )

  if (!confirmed) return
}


if (updatingResponder !== null) return

setUpdatingResponder(id)


  try {
    const response = await fetch(
      `${API_BASE_URL}/missions/${selectedMissionId}/${action}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ user_id: id })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.detail || "Request failed")
    }

    // Reload participation records
    const sessionsResponse = await fetch(
      `${API_BASE_URL}/missions/${selectedMissionId}/members`
    )

    if (!sessionsResponse.ok) {
      throw new Error("Failed to load mission sessions")
    }

    const sessionsData = await sessionsResponse.json()
    setMissionMembers(sessionsData.members)


    // Reload mission hours
    const hoursResponse = await fetch(
      `${API_BASE_URL}/missions/${selectedMissionId}/hours`
    )

    if (!hoursResponse.ok) {
      throw new Error("Failed to load mission hours")
    }

    const hoursData = await hoursResponse.json()
    setMissionHours(hoursData.hours)

    // Reload mission activity
    const activityResponse = await fetch(
      `${API_BASE_URL}/missions/${selectedMissionId}/activity`
    )

    if (!activityResponse.ok) {
      throw new Error("Failed to load mission activity")
    }

    const activityData = await activityResponse.json()
    setMissionActivity(activityData.events)


    setNotification({
  type: "success",
  message: isCheckedIn
    ? "Responder checked out successfully."
    : "Responder checked in successfully."
})

  
} catch (error) {
  console.error("Mission update failed:", error)

  setNotification({
    type: "error",
    message: error.message
  })
}
finally {
  setUpdatingResponder(null)
}

}

function calculateHours(member) {
    if (!member.checkedInAt || !member.checkedOutAt) {
      return null
    }

    const milliseconds = member.checkedOutAt - member.checkedInAt
    const hours = milliseconds / (1000 * 60 * 60)

    return hours.toFixed(2)
  }

const activeMissionCount = missions.filter(
  (mission) => mission.started_at && !mission.ended_at
).length

const completedMissionCount = missions.filter(
  (mission) => mission.ended_at !== null
).length


const totalMissionCount = missions.length


const deployedResponderCount = missionMembers.filter(
  (member) => member.checked_out_at === null
).length




  return (
  <div className="app-shell">
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <span className="brand-symbol">▲</span>
        <div>
          <strong>MISSION TRACKER</strong>
          <small>OPERATIONS CENTER</small>
        </div>
      </div>

      <div className="sidebar-section-label">WORKSPACE</div>

      <nav className="sidebar-navigation" aria-label="Main navigation">
        <a href="#dashboard" className="sidebar-link sidebar-link-active">
          ◈ Dashboard
        </a>
        <a href="#mission-history" className="sidebar-link">
          ◉ Missions
        </a>
        <a href="#currently-checked-in" className="sidebar-link">
          ◇ Responders
        </a>
        <a href="#mission-activity" className="sidebar-link">
          ◷ Activity
        </a>
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-status-dot" />
        System Online
      </div>
    </aside>

    <main className="app-container" id="dashboard">
      <header className="dashboard-header">
      <div>
        <h1>Mission Tracker</h1>
        <p>Mission management dashboard</p>
      </div>
    <section className="dashboard-stats">
  
<div
  className="stat-card stat-card-clickable"
  role="button"
  tabIndex={0}
  onClick={() => {
    document.getElementById("active-missions")?.scrollIntoView({
      behavior: "smooth"
    })
  }}
  onKeyDown={(event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      event.currentTarget.click()
    }
  }}
>
  <h3>Active Missions</h3>
  <p>{activeMissionCount}</p>
</div>

  
<button
  type="button"
  className="stat-card stat-card-clickable"
  onClick={() => {
    document.getElementById("completed-missions")?.scrollIntoView({
      behavior: "smooth"
    })
  }}
>
  <h3>Completed Missions</h3>
  <p>{completedMissionCount}</p>
</button>


<button
  type="button"
  className="stat-card stat-card-clickable"
  onClick={() => {
    document.getElementById("mission-history")?.scrollIntoView({
      behavior: "smooth"
    })
  }}
>
  <h3>Total Missions</h3>
  <p>{totalMissionCount}</p>
</button>


<button
  type="button"
  className="stat-card stat-card-clickable"
  onClick={() => {
    document.getElementById("currently-checked-in")?.scrollIntoView({
      behavior: "smooth"
    })
  }}
>
  <h3>Responders Deployed</h3>
  <p>{deployedResponderCount}</p>
  <span className="stat-description">
    Selected mission only
  </span>
</button>

</section>
    </header>
    
{notification && (
  <div
    className={`app-notification app-notification-${notification.type}`}
    role="alert"
  >
    <span>{notification.message}</span>

    <button
      type="button"
      onClick={() => setNotification(null)}
      aria-label="Dismiss notification"
    >
      ×
    </button>
  </div>
)}
  
  <MissionMap
  mission={missions.find((m) => m.id === selectedMissionId) ?? null}
  onLocationSaved={(updatedMission) => {
    setMissions((currentMissions) =>
      currentMissions.map((mission) =>
        mission.id === updatedMission.id
          ? { ...mission, ...updatedMission }
          : mission
      )
    )
  }}
  onNotify={setNotification}
/>
    
<section className="dashboard-panel">
  <div id="mission-history">
    <MissionHistory
      missions={missions}
      selectedMissionId={selectedMissionId}
      onSelectMission={setSelectedMissionId}
    />
  </div>

   {missions
  .filter((mission) => mission.id === selectedMissionId)
  .map((mission) => (
    <section key={mission.id} className="selected-mission-details">
      
<div className="mission-detail-header">
  <div>
    <span className="panel-eyebrow">MISSION OVERVIEW</span>
    <h2>Selected Mission</h2>
  </div>

  <span
    className={`mission-status-badge ${
      mission.ended_at
        ? "status-completed"
        : mission.started_at
          ? "status-active"
          : "status-pending"
    }`}
  >
    {mission.ended_at
      ? "Completed"
      : mission.started_at
        ? "Active"
        : "Not Started"}
  </span>
</div>

<h3 className="mission-detail-name">{mission.name}</h3>

<div className="mission-info-grid">
  <div className="mission-info-item">
    <span>LOCATION</span>
    <strong>{mission.location}</strong>
  </div>

  <div className="mission-info-item">
    <span>ASSIGNED TEAM</span>
    <strong>{mission.team_name}</strong>
  </div>

  <div className="mission-info-item">
    <span>MISSION ID</span>
    <strong>#{mission.id}</strong>
  </div>
</div>

      {!mission.started_at && !mission.ended_at && (
  <button
    type="button"
    onClick={() => startMission(mission.id)}
  >
    Start Mission
  </button>
)}
    
{mission.started_at && !mission.ended_at && (
  <button
    type="button"
    onClick={() => completeMission(mission.id)}
  >
    Complete Mission
  </button>
)}

      <h3>Responder Hours</h3>
      <p>
  <strong>Total Mission Hours: </strong>
  {missionHours
    .reduce(
      (total, member) => total + Number(member.total_hours || 0),
      0
    )
    .toFixed(2)}
</p>

{missionHours.length === 0 ? (
  <p>No responder hours recorded yet.</p>
) : (
  <div>
    {missionHours.map((member) => (
      <div key={member.id}>
        <strong>{member.name}</strong>
        <span>
          {" "}— {Number(member.total_hours).toFixed(2)} hours
        </span>
        <span>
          {" "}({member.session_count} sessions)
        </span>
      </div>
    ))}
  </div>
)}
   <h3 id="currently-checked-in">Currently Checked In</h3>

{missionMembers.filter(
  (member) => member.checked_out_at === null
).length === 0 ? (
  <p>No responders currently checked in.</p>
) : (
  <div>
    {missionMembers
      .filter((member) => member.checked_out_at === null)
      .map((member, index) => (
        <div key={index}>
          <strong>{member.name}</strong>
          <span>
            {" "}— Checked in at{" "}
            {new Date(member.checked_in_at).toLocaleString()}
          </span>
        </div>
      ))}
  </div>
)}

<h3>Mission Activity Log</h3>

{missionActivity.length === 0 ? (
  <p>No activity recorded for this mission yet.</p>
) : (
  <div className="mission-activity-log">
    {missionActivity.map((event) => (
      <div key={event.id} className="mission-activity-event">
        <strong>
  {event.event_type === "responder_checked_in"
    ? `${event.responder_name || "Unknown responder"} checked into the mission`
    : event.event_type === "responder_checked_out"
      ? `${event.responder_name || "Unknown responder"} checked out of the mission`
      : event.description}
</strong>
        <p>
          {new Date(event.created_at).toLocaleString()}
        </p>
      </div>
    ))}
  </div>
)}

    </section>
  ))}
    </section>
    <h2>Database Users</h2>

{users.map((user) => (
  <div key={user.id}>
    {user.name} — {user.email}
  </div>
))}
      <h2>Teams</h2>

{teams.map((team) => (
  <div key={team.id}>
    {team.name}
  </div>
))}

<h2>Create Team</h2>

<form onSubmit={createTeam}>
  <input
    type="text"
    placeholder="Team name"
    value={newTeamName}
    onChange={(event) => setNewTeamName(event.target.value)}
    required
  />

  <button type="submit" disabled={creatingTeam}>
    {creatingTeam ? "Creating..." : "Create Team"}
  </button>
</form>

<h2>Assign Team Member</h2>

<form onSubmit={assignTeamMember}>
  <select
    value={assignmentTeamId}
    onChange={(event) => setAssignmentTeamId(event.target.value)}
    required
  >
    <option value="">Select team</option>

    {teams.map((team) => (
      <option key={team.id} value={team.id}>
        {team.name}
      </option>
    ))}
  </select>

  <select
    value={assignmentUserId}
    onChange={(event) => setAssignmentUserId(event.target.value)}
    required
  >
    <option value="">Select user</option>

    {users.map((user) => (
      <option key={user.id} value={user.id}>
        {user.name}
      </option>
    ))}
  </select>

  <button type="submit" disabled={assigningMember}>
    {assigningMember ? "Assigning..." : "Assign Member"}
  </button>
</form>
      <h2>Create Mission</h2>

<form onSubmit={createMission}>
  <input
    type="text"
    placeholder="Mission name"
    value={newMissionName}
    onChange={(event) => setNewMissionName(event.target.value)}
    required
  />

  <input
    type="text"
    placeholder="Location"
    value={newMissionLocation}
    onChange={(event) => setNewMissionLocation(event.target.value)}
    required
  />

  <button type="submit" disabled={creatingMission}>
    {creatingMission ? "Creating..." : "Create Mission"}
  </button>
  <select
  value={newMissionTeamId}
  onChange={(event) => setNewMissionTeamId(event.target.value)}
  required
>
  <option value="">Select a team</option>

  {teams.map((team) => (
    <option key={team.id} value={team.id}>
      {team.name}
    </option>
  ))}
</select>

</form>
      <h2>Active Mission</h2>

<select
  value={selectedMissionId ?? ""}
  onChange={(event) =>
    setSelectedMissionId(Number(event.target.value))
  }
>
  {missions.map((mission) => (
    <option key={mission.id} value={mission.id}>
      {mission.name} — {mission.location}
    </option>
  ))}
</select>
      
      
      <h2>Team Members</h2>

      {teamMembers.map((user) => {
  const activeSession = missionMembers.find(
    (session) =>
      session.id === user.id &&
      session.checked_out_at === null
  )

  const isCheckedIn = Boolean(activeSession)

  return (
    <div key={user.id}>
      <strong>{user.name}</strong>

      <span>
        {" "}— {isCheckedIn ? "Checked In" : "Checked Out"}
      </span>

      {activeSession && (
        <span>
          {" "}— Check in:{" "}
          {new Date(activeSession.checked_in_at).toLocaleTimeString()}
        </span>
      )}

      
<button
  type="button"
  disabled={
  updatingResponder !== null ||
  (!isCheckedIn &&
    !missions.some(
      (mission) =>
        mission.id === selectedMissionId &&
        mission.started_at &&
        !mission.ended_at
    ))
}
  onClick={() => toggleStatus(user.id, isCheckedIn)}
>
  


{updatingResponder === user.id
  ? isCheckedIn
    ? "Checking Out..."
    : "Checking In..."
  : isCheckedIn
    ? "Check Out"
    : "Check In"}



</button>


      <button
        type="button"
        disabled={isCheckedIn}
        onClick={() => {
          const selectedMission = missions.find(
            (mission) => mission.id === Number(selectedMissionId)
          )

          if (selectedMission) {
            removeTeamMember(selectedMission.team_id, user.id)
          }
        }}
      >
        Remove from Team
      </button>
    </div>
  )
})}
       </main>
  </div>
  )
}

export default App