import { test, expect } from '@playwright/test'

test('completes the full mission lifecycle', async ({ page, request }) => {
  const missionName = `Lifecycle Mission ${Date.now()}`
  const teamName = `Playwright Team ${Date.now()}`

  await page.goto('/')
  // Create a dedicated team for this test run
  await page.getByPlaceholder('Team name').fill(teamName)

  await page.getByRole('button', { name: 'Create Team' }).click()

  await expect(page.getByRole('alert')).toContainText(
    'Team created successfully.',
  )

  const teamSelect = page.locator('select').filter({
    has: page.locator('option', { hasText: 'Select a team' }),
  })

  await expect(teamSelect.locator('option')).not.toHaveCount(1)

  const teamId = await teamSelect
    .locator('option', { hasText: teamName })
    .getAttribute('value')

  expect(teamId).toBeTruthy()

  await page.getByPlaceholder('Mission name').fill(missionName)
  await page.getByPlaceholder('Location', { exact: true }).fill('Truckee, CA')
  await teamSelect.selectOption(teamId!)

  await page.getByRole('button', { name: 'Create Mission' }).click()

  await expect(page.locator('.mission-detail-name')).toHaveText(missionName)

  // Start the mission
  // Accept the browser confirmation dialog
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm')
    await dialog.accept()
  })

  // Start the mission
  await page.getByRole('button', { name: 'Start Mission' }).click()

  // Verify the mission is active
  await expect(
    page.getByRole('button', { name: 'Complete Mission' }),
  ).toBeVisible()

  await expect(page.getByRole('button', { name: 'Start Mission' })).toHaveCount(
    0,
  )

  // Assign a responder to the mission's team
  const assignmentForm = page.locator('form').filter({
    has: page.getByRole('button', { name: 'Assign Member' }),
  })

  const assignmentSelects = assignmentForm.locator('select')

  // Use the same team selected during mission creation
  await assignmentSelects.nth(0).selectOption(teamId!)

  // Wait for available users
  await expect(assignmentSelects.nth(1).locator('option')).not.toHaveCount(1)

  const userId = await assignmentSelects
    .nth(1)
    .locator('option')
    .nth(1)
    .getAttribute('value')

  expect(userId).toBeTruthy()

  await assignmentSelects.nth(1).selectOption(userId!)

  await assignmentForm.getByRole('button', { name: 'Assign Member' }).click()

  await expect(page.getByRole('alert')).toContainText(
    'Team member assigned successfully.',
  )

  // Wait for the selected mission's team members to load
  const checkInButton = page
    .getByRole('button', {
      name: 'Check In',
      exact: true,
    })
    .first()

  await expect(checkInButton).toBeVisible()
  await expect(checkInButton).toBeEnabled()

  // Check in a responder
  await checkInButton.click()

  // Verify check-in succeeded
  const checkOutButton = page
    .getByRole('button', {
      name: 'Check Out',
      exact: true,
    })
    .first()

  await expect(checkOutButton).toBeVisible()

  // Accept the check-out confirmation
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm')
    await dialog.accept()
  })

  // Check out the responder
  await checkOutButton.click()

  // Verify the responder is checked out
  await expect(page.getByRole('alert')).toContainText(
    'Responder checked out successfully.',
  )

  // Accept the completion confirmation
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm')
    await dialog.accept()
  })

  // Complete the mission
  await page.getByRole('button', { name: 'Complete Mission' }).click()

  // Verify the mission is completed
  await expect(
    page.locator('.selected-mission-details .mission-status-badge'),
  ).toHaveText('Completed')

  // Verify lifecycle action buttons are gone
  await expect(page.getByRole('button', { name: 'Start Mission' })).toHaveCount(
    0,
  )

  await expect(
    page.getByRole('button', { name: 'Complete Mission' }),
  ).toHaveCount(0)

  // Get the mission ID from the selected mission panel
  const missionIdText = await page
    .locator('.mission-info-item')
    .filter({ hasText: 'MISSION ID' })
    .locator('strong')
    .innerText()

  const missionId = missionIdText.replace('#', '').trim()

  // Retrieve recorded responder hours
  const hoursResponse = await request.get(
    `http://127.0.0.1:8001/missions/${missionId}/hours`,
  )

  expect(hoursResponse.ok()).toBeTruthy()

  const hoursData = await hoursResponse.json()

  // Verify the hours response contains responder records
  expect(Array.isArray(hoursData.hours)).toBe(true)

  // Find the responder assigned earlier in the test
  const responderHours = hoursData.hours.find(
    (member: { id: number }) => member.id === Number(userId),
  )

  // Verify the responder has one completed session
  expect(responderHours).toBeDefined()
  expect(responderHours.session_count).toBe(1)

  // Verify hours were calculated
  expect(typeof responderHours.total_hours).toBe('number')
  expect(responderHours.total_hours).toBeGreaterThanOrEqual(0)

  // Verify completion was persisted in the backend
  const missionsResponse = await request.get('http://127.0.0.1:8001/missions')

  expect(missionsResponse.ok()).toBeTruthy()

  const missionsData = await missionsResponse.json()

  const completedMission = missionsData.missions.find(
    (mission: { id: number }) => mission.id === Number(missionId),
  )

  expect(completedMission).toBeDefined()
  expect(completedMission.started_at).not.toBeNull()
  expect(completedMission.ended_at).not.toBeNull()
})
