import { useState, useEffect } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

const teamMembers = [
  {
    id: 1,
    name: "Michael",
    status: "Checked In",
    checkedInAt: new Date(),
    checkedOutAt: null
  },
  {
    id: 2,
    name: "Sarah",
    status: "Checked In",
    checkedInAt: new Date(),
    checkedOutAt: null
  },
  {
    id: 3,
    name: "John",
    status: "Checked Out",
    checkedInAt: null,
    checkedOutAt: null
  }
]

function App() {
  const [members, setMembers] = useState(teamMembers)
  const [users, setUsers] = useState([])
  const [missionMembers, setMissionMembers] = useState([])
  const [missionHours, setMissionHours] = useState([])


  useEffect(() => {
  // Get all users
  fetch("http://127.0.0.1:8000/users")
    .then((response) => response.json())
    .then((data) => {
      setUsers(data.users)
    })
    .catch((error) => {
      console.error("Error fetching users:", error)
    })

  // Get mission 1 participation sessions
  fetch("http://127.0.0.1:8000/missions/1/members")
    .then((response) => response.json())
    .then((data) => {
      setMissionMembers(data.members)
    })
    .catch((error) => {
      console.error("Error fetching mission members:", error)
    })

  // Get total hours for mission 1
  fetch("http://127.0.0.1:8000/missions/1/hours")
    .then((response) => response.json())
    .then((data) => {
      setMissionHours(data.hours)
    })
    .catch((error) => {
      console.error("Error fetching mission hours:", error)
    })
}, [])
  function toggleStatus(id) {
  setMembers(
    members.map((member) => {
      if (member.id !== id) {
        return member
      }

      if (member.status === "Checked In") {
        return {
          ...member,
          status: "Checked Out",
          checkedOutAt: new Date()
        }
      }

      return {
        ...member,
        status: "Checked In",
        checkedInAt: new Date(),
        checkedOutAt: null
      }
    })
  )
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

      <h2>Active Mission</h2>
      <h3>Search & Rescue — Mt. Shasta</h3>
      <h2>Mission Hours</h2>

{missionHours.map((member) => (
  <div key={member.id}>
    <strong>{member.name}</strong>
    <span> — Sessions: {member.session_count}</span>
    <span> — Total Hours: {Number(member.total_hours).toFixed(2)}</span>
  </div>
))}
      <h2>Mission 1 Database Sessions</h2>

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

      {members.map((member) => (
  <div key={member.id}>
    <strong>{member.name}</strong>
    <span> — {member.status}</span>
    {member.checkedInAt && (
      <span>
        {" "}Check in: {member.checkedInAt.toLocaleTimeString()}
      </span>
    )}

    {member.checkedOutAt && (
      <span>
        {" "}Check out: {member.checkedOutAt.toLocaleTimeString()}
      </span>
    )}
    {calculateHours(member) && (
  <span>
    {" "}Hours: {calculateHours(member)}
  </span>
)}
    <button onClick={() => toggleStatus(member.id)}>
      {member.status === "Checked In" ? "Check Out" : "Check In"}
    </button>
  </div>
))}
    </div>
  )
}

export default App