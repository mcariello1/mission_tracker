import { useState, useEffect } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'


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
  const [teamMembers, setTeamMembers] = useState([])
  const [newMissionName, setNewMissionName] = useState("")
  const [newMissionLocation, setNewMissionLocation] = useState("")
  const [newMissionTeamId, setNewMissionTeamId] = useState("")
  const [creatingMission, setCreatingMission] = useState(false)


  useEffect(() => {
  // Load teams
  fetch("http://127.0.0.1:8000/teams")
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
  fetch("http://127.0.0.1:8000/missions")
    .then((response) => response.json())
    .then((data) => {
      setMissions(data.missions)

      if (data.missions.length > 0) {
        setSelectedMissionId(data.missions[0].id)
      }
    })
    .catch((error) => {
      console.error("Error fetching missions:", error)
    })

  // Load users
  fetch("http://127.0.0.1:8000/users")
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
      const [membersResponse, hoursResponse, teamResponse] = await Promise.all([
  fetch(
    `http://127.0.0.1:8000/missions/${selectedMissionId}/members`
  ),
  fetch(
    `http://127.0.0.1:8000/missions/${selectedMissionId}/hours`
  ),
  fetch(
    `http://127.0.0.1:8000/missions/${selectedMissionId}/team`
  )
])

      if (!membersResponse.ok || !hoursResponse.ok || !teamResponse.ok) {
        throw new Error("Failed to load mission data")
      }

      const membersData = await membersResponse.json()
      const hoursData = await hoursResponse.json()
      const teamData = await teamResponse.json()

      setMissionMembers(membersData.members)
      setMissionHours(hoursData.hours)
      setTeamMembers(teamData.members)
    } catch (error) {
      console.error("Error loading mission:", error)
    }
  }

  setMissionMembers([])
  setMissionHours([])
  setTeamMembers([])
  loadMissionData()
}, [selectedMissionId])

  async function removeTeamMember(teamId, userId) {
  const confirmed = window.confirm(
    "Are you sure you want to remove this user from the team?"
  )

  if (!confirmed) return

  try {
    const response = await fetch(
      `http://127.0.0.1:8000/teams/${teamId}/members/${userId}`,
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
      `http://127.0.0.1:8000/missions/${selectedMissionId}/team`
    )

    if (!teamResponse.ok) {
      throw new Error("Member removed, but refresh failed")
    }

    const teamData = await teamResponse.json()
    setTeamMembers(teamData.members)

  } catch (error) {
    console.error("Failed to remove member:", error)
    alert(error.message)
  }
}

  async function assignTeamMember(event) {
  event.preventDefault()

  if (!assignmentTeamId || !assignmentUserId) return

  setAssigningMember(true)

  try {
    const response = await fetch(
      `http://127.0.0.1:8000/teams/${assignmentTeamId}/members`,
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

    alert("Team member assigned successfully!")

    setAssignmentUserId("")
    setAssignmentTeamId("")

    // Refresh the selected mission's team if it uses this team
    const selectedMission = missions.find(
      (mission) => mission.id === selectedMissionId
    )

    if (selectedMission?.team_id === Number(assignmentTeamId)) {
      const teamResponse = await fetch(
        `http://127.0.0.1:8000/missions/${selectedMissionId}/team`
      )

      if (!teamResponse.ok) {
        throw new Error("Assignment saved, but team refresh failed")
      }

      const teamData = await teamResponse.json()
      setTeamMembers(teamData.members)
    }

  } catch (error) {
    console.error("Team assignment failed:", error)
    alert(error.message)
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
      "http://127.0.0.1:8000/teams",
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
  } catch (error) {
    console.error("Error creating team:", error)
    alert(error.message)
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
      "http://127.0.0.1:8000/missions",
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

  } catch (error) {
    console.error("Error creating mission:", error)
    alert(error.message)
  } finally {
    setCreatingMission(false)
  }
}
  async function toggleStatus(id, isCheckedIn) {
  const action = isCheckedIn ? "check-out" : "check-in"

  try {
    const response = await fetch(
      `http://127.0.0.1:8000/missions/${selectedMissionId}/${action}`,
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
      `http://127.0.0.1:8000/missions/${selectedMissionId}/members`
    )

    if (!sessionsResponse.ok) {
      throw new Error("Failed to load mission sessions")
    }

    const sessionsData = await sessionsResponse.json()
    setMissionMembers(sessionsData.members)

    // Reload mission hours
    const hoursResponse = await fetch(
      `http://127.0.0.1:8000/missions/${selectedMissionId}/hours`
    )

    if (!hoursResponse.ok) {
      throw new Error("Failed to load mission hours")
    }

    const hoursData = await hoursResponse.json()
    setMissionHours(hoursData.hours)

  } catch (error) {
    console.error("Mission update failed:", error)
    alert(error.message)
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

  return (
    <div>
      <h1>Mission Tracker</h1>
      <p>Mission management dashboard</p>
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
      <h2>Mission Hours</h2>

{missionHours.map((member) => (
  <div key={member.id}>
    <strong>{member.name}</strong>
    <span> — Sessions: {member.session_count}</span>
    <span> — Total Hours: {Number(member.total_hours).toFixed(2)}</span>
  </div>
))}
      <h2>Mission {selectedMissionId} Database Sessions</h2>

{missionMembers.map((member, index) => (
  <div key={index}>
    <strong>{member.name}</strong>

    <span>
      {" "}— Check in:{" "}
      {new Date(member.checked_in_at).toLocaleTimeString()}
    </span>

    {member.checked_out_at && (
      <span>
        {" "}Check out:{" "}
        {new Date(member.checked_out_at).toLocaleTimeString()}
      </span>
    )}
  </div>
))}
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
        onClick={() => toggleStatus(user.id, isCheckedIn)}
      >
        {isCheckedIn ? "Check Out" : "Check In"}
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
    </div>
  )
}

export default App