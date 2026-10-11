import { useState, useEffect } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'


function App() {
  const [users, setUsers] = useState([])
  const [missions, setMissions] = useState([])
  const [selectedMissionId, setSelectedMissionId] = useState(null)
  const [missionMembers, setMissionMembers] = useState([])
  const [missionHours, setMissionHours] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [newMissionName, setNewMissionName] = useState("")
  const [newMissionLocation, setNewMissionLocation] = useState("")
  const [creatingMission, setCreatingMission] = useState(false)


  useEffect(() => {
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

  async function createMission(event) {
  event.preventDefault()

  if (!newMissionName.trim() || !newMissionLocation.trim()) {
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
          team_id: 1
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
    setTeamMembers(teamData.members)

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
    </div>
  )
})}
    </div>
  )
}

export default App