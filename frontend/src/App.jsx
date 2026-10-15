import { useState, useEffect } from 'react'
import './App.css'
import MissionHistory from './components/MissionHistory'
import MissionMap from './components/MissionMap'
import { API_BASE_URL } from './config'

function App() {
  const [users, setUsers] = useState([])
  const [missions, setMissions] = useState([])
  const [teams, setTeams] = useState([])
  const [assignmentTeamId, setAssignmentTeamId] = useState('')
  const [assignmentUserId, setAssignmentUserId] = useState('')
  const [assigningMember, setAssigningMember] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [selectedMissionId, setSelectedMissionId] = useState(null)
  const [missionMembers, setMissionMembers] = useState([])
  const [missionHours, setMissionHours] = useState([])
  const [missionActivity, setMissionActivity] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [loadingMission, setLoadingMission] = useState(false)
  const [newMissionName, setNewMissionName] = useState('')
  const [newMissionLocation, setNewMissionLocation] = useState('')
  const [newMissionTeamId, setNewMissionTeamId] = useState('')
  const [creatingMission, setCreatingMission] = useState(false)
  const [notification, setNotification] = useState(null)

  const [updatingResponder, setUpdatingResponder] = useState(null)

  useEffect(() => {
    // Load teams
    fetch(`${API_BASE_URL}/teams`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load teams')
        }
        return response.json()
      })
      .then((data) => setTeams(data.teams))
      .catch((error) => {
        console.error('Error fetching teams:', error)
      })
    // Load missions
    fetch(`${API_BASE_URL}/missions`)
      .then((response) => response.json())
      .then((data) => {
        setMissions(data.missions)

        if (data.missions.length > 0) {
          const activeMission = data.missions.find(
            (mission) => mission.started_at && !mission.ended_at,
          )

          setSelectedMissionId(
            activeMission ? activeMission.id : data.missions[0].id,
          )
        }
      })
      .catch((error) => {
        console.error('Error fetching missions:', error)
      })

    // Load users
    fetch(`${API_BASE_URL}/users`)
      .then((response) => response.json())
      .then((data) => setUsers(data.users))
      .catch((error) => {
        console.error('Error fetching users:', error)
      })
  }, [])

  // Reload mission data whenever the selected mission changes
  useEffect(() => {
    if (selectedMissionId === null) return

    const controller = new AbortController()

    async function loadMissionData() {
      setLoadingMission(true)

      try {
        const endpoints = ['members', 'hours', 'team', 'activity']

        const responses = await Promise.all(
          endpoints.map((endpoint) =>
            fetch(`${API_BASE_URL}/missions/${selectedMissionId}/${endpoint}`, {
              signal: controller.signal,
            }),
          ),
        )

        if (responses.some((response) => !response.ok)) {
          throw new Error('Failed to load mission data')
        }

        const [membersData, hoursData, teamData, activityData] =
          await Promise.all(responses.map((response) => response.json()))

        if (controller.signal.aborted) return

        setMissionMembers(membersData.members)
        setMissionHours(hoursData.hours)
        setTeamMembers(teamData.members)
        setMissionActivity(activityData.events)
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error loading mission:', error)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingMission(false)
        }
      }
    }

    loadMissionData()

    return () => controller.abort()
  }, [selectedMissionId])

  async function removeTeamMember(teamId, userId) {
    const confirmed = window.confirm(
      'Are you sure you want to remove this user from the team?',
    )

    if (!confirmed) return

    try {
      const response = await fetch(
        `${API_BASE_URL}/teams/${teamId}/members/${userId}`,
        {
          method: 'DELETE',
        },
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to remove member')
      }

      // Refresh the current mission's team members
      const teamResponse = await fetch(
        `${API_BASE_URL}/missions/${selectedMissionId}/team`,
      )

      if (!teamResponse.ok) {
        throw new Error('Member removed, but refresh failed')
      }

      const teamData = await teamResponse.json()
      setTeamMembers(teamData.members)

      setNotification({
        type: 'success',
        message: 'Team member removed successfully.',
      })
    } catch (error) {
      console.error('Failed to remove member:', error)

      setNotification({
        type: 'error',
        message: error.message,
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
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: Number(assignmentUserId),
          }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to assign team member')
      }

      setNotification({
        type: 'success',
        message: 'Team member assigned successfully.',
      })

      setAssignmentUserId('')
      setAssignmentTeamId('')

      // Refresh the selected mission's team if it uses this team
      const selectedMission = missions.find(
        (mission) => mission.id === selectedMissionId,
      )

      if (selectedMission?.team_id === Number(assignmentTeamId)) {
        const teamResponse = await fetch(
          `${API_BASE_URL}/missions/${selectedMissionId}/team`,
        )

        if (!teamResponse.ok) {
          throw new Error('Assignment saved, but team refresh failed')
        }

        const teamData = await teamResponse.json()
        setTeamMembers(teamData.members)
      }
    } catch (error) {
      console.error('Team assignment failed:', error)

      setNotification({
        type: 'error',
        message: error.message,
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
      const response = await fetch(`${API_BASE_URL}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTeamName.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to create team')
      }

      setTeams((previousTeams) => [...previousTeams, data.team])

      setNewTeamName('')

      setNotification({
        type: 'success',
        message: 'Team created successfully.',
      })
    } catch (error) {
      console.error('Error creating team:', error)

      setNotification({
        type: 'error',
        message: error.message,
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
      alert('Please fill out all fields and select a team.')
      return
    }

    setCreatingMission(true)

    try {
      const response = await fetch(`${API_BASE_URL}/missions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newMissionName.trim(),
          location: newMissionLocation.trim(),
          team_id: Number(newMissionTeamId),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to create mission')
      }

      const newMission = data.mission

      setMissions((previousMissions) => [...previousMissions, newMission])

      setSelectedMissionId(newMission.id)
      setNewMissionName('')
      setNewMissionLocation('')
      setNewMissionTeamId('')

      setNotification({
        type: 'success',
        message: 'Mission created successfully.',
      })
    } catch (error) {
      console.error('Error creating mission:', error)

      setNotification({
        type: 'error',
        message: error.message,
      })
    } finally {
      setCreatingMission(false)
    }
  }

  async function startMission(missionId) {
    const confirmed = window.confirm(
      'Are you sure you want to start this mission?',
    )

    if (!confirmed) return
    try {
      const response = await fetch(
        `${API_BASE_URL}/missions/${missionId}/start`,
        { method: 'POST' },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to start mission')
      }

      setMissions((previousMissions) =>
        previousMissions.map((mission) =>
          mission.id === missionId ? { ...mission, ...data.mission } : mission,
        ),
      )

      // Refresh activity for the selected mission
      if (selectedMissionId === missionId) {
        const activityResponse = await fetch(
          `${API_BASE_URL}/missions/${missionId}/activity`,
        )

        if (!activityResponse.ok) {
          throw new Error('Failed to refresh mission activity')
        }

        const activityData = await activityResponse.json()
        setMissionActivity(activityData.events)
      }

      setNotification({
        type: 'success',
        message: 'Mission started successfully.',
      })
    } catch (error) {
      console.error('Failed to start mission:', error)

      setNotification({
        type: 'error',
        message: error.message,
      })
    }
  }

  async function completeMission(missionId) {
    const confirmed = window.confirm(
      'Are you sure you want to complete this mission?',
    )

    if (!confirmed) return
    try {
      const response = await fetch(
        `${API_BASE_URL}/missions/${missionId}/complete`,
        { method: 'POST' },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to complete mission')
      }

      setMissions((previousMissions) =>
        previousMissions.map((mission) =>
          mission.id === missionId ? { ...mission, ...data.mission } : mission,
        ),
      )

      // Refresh activity for the selected mission
      if (selectedMissionId === missionId) {
        const activityResponse = await fetch(
          `${API_BASE_URL}/missions/${missionId}/activity`,
        )

        if (!activityResponse.ok) {
          throw new Error('Failed to refresh mission activity')
        }

        const activityData = await activityResponse.json()
        setMissionActivity(activityData.events)
      }

      setNotification({
        type: 'success',
        message: 'Mission completed successfully.',
      })
    } catch (error) {
      console.error('Failed to complete mission:', error)

      setNotification({
        type: 'error',
        message: error.message,
      })
    }
  }

  async function toggleStatus(id, isCheckedIn) {
    const action = isCheckedIn ? 'check-out' : 'check-in'
    if (isCheckedIn) {
      const confirmed = window.confirm(
        'Are you sure you want to check out this responder?',
      )

      if (!confirmed) return
    }

    if (updatingResponder !== null) return

    setUpdatingResponder(id)

    try {
      const response = await fetch(
        `${API_BASE_URL}/missions/${selectedMissionId}/${action}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: id }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Request failed')
      }

      // Reload participation records
      const sessionsResponse = await fetch(
        `${API_BASE_URL}/missions/${selectedMissionId}/members`,
      )

      if (!sessionsResponse.ok) {
        throw new Error('Failed to load mission sessions')
      }

      const sessionsData = await sessionsResponse.json()
      setMissionMembers(sessionsData.members)

      // Reload mission hours
      const hoursResponse = await fetch(
        `${API_BASE_URL}/missions/${selectedMissionId}/hours`,
      )

      if (!hoursResponse.ok) {
        throw new Error('Failed to load mission hours')
      }

      const hoursData = await hoursResponse.json()
      setMissionHours(hoursData.hours)

      // Reload mission activity
      const activityResponse = await fetch(
        `${API_BASE_URL}/missions/${selectedMissionId}/activity`,
      )

      if (!activityResponse.ok) {
        throw new Error('Failed to load mission activity')
      }

      const activityData = await activityResponse.json()
      setMissionActivity(activityData.events)

      setNotification({
        type: 'success',
        message: isCheckedIn
          ? 'Responder checked out successfully.'
          : 'Responder checked in successfully.',
      })
    } catch (error) {
      console.error('Mission update failed:', error)

      setNotification({
        type: 'error',
        message: error.message,
      })
    } finally {
      setUpdatingResponder(null)
    }
  }

  const activeMissionCount = missions.filter(
    (mission) => mission.started_at && !mission.ended_at,
  ).length

  const completedMissionCount = missions.filter(
    (mission) => mission.ended_at !== null,
  ).length

  const totalMissionCount = missions.length

  const deployedResponderCount = missionMembers.filter(
    (member) => member.checked_out_at === null,
  ).length

  const selectedMission = missions.find(
    (mission) => mission.id === selectedMissionId,
  )
  const selectedMissionHours = missionHours.reduce(
    (total, member) => total + Number(member.total_hours || 0),
    0,
  )

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <a className="sidebar-brand" href="#dashboard" aria-label="Mission Tracker home">
          <span className="brand-symbol" aria-hidden="true">▲</span>
          <span className="sidebar-brand-copy">
            <strong>MISSION TRACKER</strong>
            <small>OPERATIONS CENTER</small>
          </span>
        </a>

        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="sidebar-navigation" aria-label="Main navigation">
          <a href="#dashboard" className="sidebar-link sidebar-link-active">◈ <span>Dashboard</span></a>
          <a href="#mission-history" className="sidebar-link">◉ <span>Missions</span></a>
          <a href="#currently-checked-in" className="sidebar-link">◇ <span>Responders</span></a>
          <a href="#mission-activity" className="sidebar-link">◷ <span>Activity</span></a>
          <a href="#team-management" className="sidebar-link">♧ <span>Teams & users</span></a>
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-status-dot" />
          <span>System Online</span>
        </div>
      </aside>

      <main className="app-container" id="dashboard">
        <header className="dashboard-header">
          <div>
            <span className="panel-eyebrow">OPERATIONS CENTER</span>
            <h1>Mission Tracker</h1>
            <p>Track missions, teams, and responder activity.</p>
          </div>
          <a className="primary-action header-action" href="#create-mission-form">＋ Create Mission</a>
        </header>

        <section className="dashboard-stats" aria-label="Mission statistics">
          <button
            type="button"
            className="stat-card stat-card-clickable"
            onClick={() => document.getElementById('active-missions')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <span className="stat-card-top"><span>Active Missions</span><span className="stat-icon stat-icon-active" aria-hidden="true">▶</span></span>
            <strong>{activeMissionCount}</strong>
            <small className="stat-description">Currently in progress</small>
          </button>
          <button
            type="button"
            className="stat-card stat-card-clickable"
            onClick={() => document.getElementById('completed-missions')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <span className="stat-card-top"><span>Completed Missions</span><span className="stat-icon stat-icon-hours" aria-hidden="true">✓</span></span>
            <strong>{completedMissionCount}</strong>
            <small className="stat-description">Successfully completed</small>
          </button>
          <button
            type="button"
            className="stat-card stat-card-clickable"
            onClick={() => document.getElementById('mission-history')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <span className="stat-card-top"><span>Total Missions</span><span className="stat-icon stat-icon-map" aria-hidden="true">▤</span></span>
            <strong>{totalMissionCount}</strong>
            <small className="stat-description">Across all missions</small>
          </button>
          <button
            type="button"
            className="stat-card stat-card-clickable"
            onClick={() => document.getElementById('currently-checked-in')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <span className="stat-card-top"><span>Responders Deployed</span><span className="stat-icon stat-icon-people" aria-hidden="true">♧</span></span>
            <strong>{deployedResponderCount}</strong>
            <small className="stat-description">Selected mission only</small>
          </button>
        </section>

        {notification && (
          <div className={`app-notification app-notification-${notification.type}`} role="alert">
            <span>{notification.message}</span>
            <button type="button" onClick={() => setNotification(null)} aria-label="Dismiss notification">×</button>
          </div>
        )}

        <section className="dashboard-primary-grid" aria-label="Current mission overview">
          <section className="selected-mission-details panel-card">
            {loadingMission ? (
              <p role="status">Loading mission details…</p>
            ) : selectedMission ? (
              <>
                <div className="mission-detail-header">
                  <div>
                    <span className="panel-eyebrow">CURRENT MISSION</span>
                    <h2 className="mission-detail-name">{selectedMission.name}</h2>
                    <p className="mission-detail-subtitle">
                      {selectedMission.location || 'Location not specified'}
                      {selectedMission.team_name ? ` · ${selectedMission.team_name}` : ''}
                    </p>
                  </div>
                  <span className={`mission-status-badge ${selectedMission.ended_at ? 'status-completed' : selectedMission.started_at ? 'status-active' : 'status-pending'}`}>
  {selectedMission.ended_at ? 'Completed' : selectedMission.started_at ? 'Active' : 'Not Started'}
</span>
                </div>

                <div className="mission-info-grid">
                  <div className="mission-info-item">
                    <span>START TIME</span>
                    <strong>{selectedMission.started_at ? new Date(selectedMission.started_at).toLocaleString() : 'Not started'}</strong>
                  </div>
                  <div className="mission-info-item">
                    <span>LOCATION</span>
                    <strong>{selectedMission.location || 'Not specified'}</strong>
                  </div>
                  <div className="mission-info-item">
                    <span>TEAM</span>
                    <strong>{selectedMission.team_name || 'Unassigned'}</strong>
                  </div>
                  <div className="mission-info-item">
  <span>MISSION ID</span>
  <strong>#{selectedMission.id}</strong>
</div>
                </div>

                <div className="mission-metric-grid">
                  <div className="mission-metric-card">
                    <span>Mission Hours</span>
                    <strong>{selectedMissionHours.toFixed(2)}</strong>
                    <small>Total responder hours</small>
                  </div>
                  <div className="mission-metric-card">
                    <span>Responders</span>
                    <strong>{deployedResponderCount}</strong>
                    <small>Currently checked in</small>
                  </div>
                  <div className="mission-metric-card">
                    <span>Activity</span>
                    <strong>{missionActivity.length}</strong>
                    <small>Recorded events</small>
                  </div>
                </div>

                <div className="mission-lifecycle-actions">
                  {!selectedMission.started_at && !selectedMission.ended_at && (
                    <button type="button" className="button-primary" onClick={() => startMission(selectedMission.id)}>Start Mission</button>
                  )}
                  {selectedMission.started_at && !selectedMission.ended_at && (
                    <button type="button" className="button-danger" onClick={() => completeMission(selectedMission.id)}>Complete Mission</button>
                  )}
                  <label className="mission-select-label" htmlFor="selected-mission-select">Switch mission</label>
                  <select
                    id="selected-mission-select"
                    value={selectedMissionId ?? ''}
                    onChange={(event) => setSelectedMissionId(Number(event.target.value))}
                    aria-label="Select active mission"
                  >
                    {missions.map((mission) => (
                      <option key={mission.id} value={mission.id}>{mission.name} — {mission.location}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <span className="panel-eyebrow">CURRENT MISSION</span>
                <h2>No mission selected</h2>
                <p>Create a mission to start coordinating responders and tracking activity.</p>
                <a className="primary-action" href="#create-mission-form">Create your first mission</a>
              </div>
            )}
          </section>

          <MissionMap
            mission={selectedMission ?? null}
            onLocationSaved={(updatedMission) => {
              setMissions((currentMissions) =>
                currentMissions.map((mission) =>
                  mission.id === updatedMission.id ? { ...mission, ...updatedMission } : mission,
                ),
              )
            }}
            onNotify={setNotification}
          />
        </section>

        <section className="dashboard-operations-grid" aria-label="Mission operations">
          <section className="panel-card operations-card responders-card">
            <div className="panel-heading-row">
              <div>
                <span className="panel-eyebrow">FIELD TEAM</span>
                <h2 id="currently-checked-in">Responders</h2>
              </div>
              <span className="panel-count">{teamMembers.length}</span>
            </div>
            {!selectedMission ? (
              <p className="empty-copy">Select a mission to view its assigned team.</p>
            ) : teamMembers.length === 0 ? (
              <p className="empty-copy">No responders assigned to this mission’s team.</p>
            ) : (
              <div className="responder-table">
                {teamMembers.map((user) => {
                  const activeSession = missionMembers.find((session) => session.id === user.id && session.checked_out_at === null)
                  const isCheckedIn = Boolean(activeSession)
                  const missionIsActive = Boolean(selectedMission.started_at && !selectedMission.ended_at)
                  return (
                    <div className="responder-row" key={user.id}>
                      <div className="responder-avatar" aria-hidden="true">{user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</div>
                      <div className="responder-identity">
                        <strong>{user.name}</strong>
                        <small>{isCheckedIn ? `Checked in · ${new Date(activeSession.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not checked in'}</small>
                      </div>
                      <span className={`responder-state ${isCheckedIn ? 'responder-state-active' : ''}`}>{isCheckedIn ? 'IN FIELD' : 'OFF DUTY'}</span>
                      <button
                        type="button"
                        className="button-secondary responder-action"
                        disabled={updatingResponder !== null || (!isCheckedIn && !missionIsActive)}
                        onClick={() => toggleStatus(user.id, isCheckedIn)}
                      >
                        {updatingResponder === user.id ? (isCheckedIn ? 'Checking out…' : 'Checking in…') : isCheckedIn ? 'Check Out' : 'Check In'}
                      </button>
                      <button
                        type="button"
                        className="button-quiet responder-remove"
                        disabled={isCheckedIn}
                        onClick={() => removeTeamMember(selectedMission.team_id, user.id)}
                      >Remove</button>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section className="panel-card operations-card activity-card">
            <div className="panel-heading-row">
              <div>
                <span className="panel-eyebrow">MISSION LOG</span>
                <h2 id="mission-activity">Recent Activity</h2>
              </div>
              <span className="panel-count">{missionActivity.length}</span>
            </div>
            {missionActivity.length === 0 ? (
              <p className="empty-copy">No activity recorded for this mission yet.</p>
            ) : (
              <div className="activity-timeline">
                {missionActivity.slice(0, 8).map((event) => (
                  <div key={event.id} className="activity-item">
                    <span className="activity-marker" aria-hidden="true" />
                    <div>
                      <strong>
                        {event.event_type === 'responder_checked_in'
                          ? `${event.responder_name || 'Unknown responder'} checked in`
                          : event.event_type === 'responder_checked_out'
                            ? `${event.responder_name || 'Unknown responder'} checked out`
                            : event.description || event.event_type || 'Mission updated'}
                      </strong>
                      <small>{new Date(event.created_at).toLocaleString()}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="dashboard-overview-history panel-card" id="mission-history">
            <MissionHistory
              missions={missions}
              selectedMissionId={selectedMissionId}
              onSelectMission={setSelectedMissionId}
            />
          </div>
        </section>

        <section className="panel-card hours-panel" id="responder-hours">
          <div className="panel-heading-row">
            <div>
              <span className="panel-eyebrow">TIME ACCOUNTING</span>
              <h2>Responder Hours</h2>
            </div>
            <span className="panel-count">{missionHours.length}</span>
          </div>
          {missionHours.length === 0 ? (
            <p className="empty-copy">No responder hours recorded yet.</p>
          ) : (
            <div className="hours-list">
              {missionHours.map((member) => (
                <div className="hours-row" key={member.id}>
                  <div><strong>{member.name}</strong><small>{member.session_count} sessions</small></div>
                  <strong>{Number(member.total_hours || 0).toFixed(2)} hrs</strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="management-section" id="team-management">
          <div className="management-section-heading">
            <div><span className="panel-eyebrow">ADMINISTRATION</span><h2>Team & User Management</h2></div>
            <p>Manage responder accounts, teams, and mission assignments.</p>
          </div>

          <div className="management-grid">
            <section className="panel-card management-card users-card">
              <div className="panel-heading-row"><h3>♧ Database Users</h3><span className="panel-count">{users.length}</span></div>
              {users.length === 0 ? <p className="empty-copy">No users found.</p> : (
                <div className="table-scroll"><table className="data-table"><thead><tr><th>Name</th><th>Email</th></tr></thead><tbody>
                  {users.map((user) => <tr key={user.id}><td>{user.name}</td><td>{user.email}</td></tr>)}
                </tbody></table></div>
              )}
            </section>

            <section className="panel-card management-card teams-card">
              <div className="panel-heading-row"><h3>♧ Teams</h3><span className="panel-count">{teams.length}</span></div>
              {teams.length === 0 ? <p className="empty-copy">No teams created yet.</p> : (
                <div className="team-list">{teams.map((team) => <div className="team-list-row" key={team.id}><span className="team-mark" aria-hidden="true">◆</span><span>{team.name}</span></div>)}</div>
              )}
            </section>

            <div className="management-form-stack">
              <section className="panel-card management-card">
                <div className="panel-heading-row"><h3>Create Team</h3></div>
                <form className="management-form" onSubmit={createTeam}>
                  <label htmlFor="new-team-name">Team name</label>
                  <div className="form-inline-row">
                    <input id="new-team-name" type="text" placeholder="Enter team name" value={newTeamName} onChange={(event) => setNewTeamName(event.target.value)} required />
                    <button type="submit" className="button-primary" disabled={creatingTeam}>{creatingTeam ? 'Creating…' : 'Create Team'}</button>
                  </div>
                </form>
              </section>

              <section className="panel-card management-card">
                <div className="panel-heading-row"><h3>Assign Team Member</h3></div>
                <form className="management-form" onSubmit={assignTeamMember}>
                  <div className="form-grid-two">
                    <div><label htmlFor="assignment-team">Select team</label><select id="assignment-team" value={assignmentTeamId} onChange={(event) => setAssignmentTeamId(event.target.value)} required><option value="">Select team</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></div>
                    <div><label htmlFor="assignment-user">Select user</label><select id="assignment-user" value={assignmentUserId} onChange={(event) => setAssignmentUserId(event.target.value)} required><option value="">Select user</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></div>
                  </div>
                  <button type="submit" className="button-primary form-submit" disabled={assigningMember}>{assigningMember ? 'Assigning…' : 'Assign Member'}</button>
                </form>
              </section>

              <section className="panel-card management-card" id="create-mission-form">
                <div className="panel-heading-row"><h3>Create Mission</h3></div>
                <form className="management-form" onSubmit={createMission}>
                  <div><label htmlFor="new-mission-name">Mission name</label><input id="new-mission-name" type="text" placeholder="Mission name" value={newMissionName} onChange={(event) => setNewMissionName(event.target.value)} required /></div>
                  <div><label htmlFor="new-mission-location">Location</label><input id="new-mission-location" type="text" placeholder="Location" value={newMissionLocation} onChange={(event) => setNewMissionLocation(event.target.value)} required /></div>
                  <div><label htmlFor="new-mission-team">Assigned team</label><select id="new-mission-team" value={newMissionTeamId} onChange={(event) => setNewMissionTeamId(event.target.value)} required><option value="">Select a team</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></div>
                  <button type="submit" className="button-primary form-submit" disabled={creatingMission}>{creatingMission ? 'Creating…' : 'Create Mission'}</button>
                </form>
              </section>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
