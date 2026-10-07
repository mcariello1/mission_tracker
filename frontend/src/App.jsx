import { useState } from 'react'
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
          checkedInAt: null
        }
      }

      return {
        ...member,
        status: "Checked In",
        checkedInAt: new Date()
      }
    })
  )
}

  return (
    <div>
      <h1>Mission Tracker</h1>
      <p>Mission management dashboard</p>

      <h2>Active Mission</h2>
      <h3>Search & Rescue — Mt. Shasta</h3>

      <h2>Team Members</h2>

      {members.map((member) => (
  <div key={member.id}>
    <strong>{member.name}</strong>
    <span> — {member.status}</span>
    {member.checkedInAt && (
  <span>
    {" "}at {member.checkedInAt.toLocaleTimeString()}
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