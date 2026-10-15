import { test, expect } from '@playwright/test'

test('creates a mission successfully', async ({ page, request }) => {
  const missionName = `Playwright Mission ${Date.now()}`
const teamName = `Playwright Team ${Date.now()}`

await page.goto('/')

// Create a dedicated team for this test
await page.getByPlaceholder('Team name').fill(teamName)
await page.getByRole('button', { name: 'Create Team' }).click()

await expect(page.getByRole('alert')).toContainText(
  'Team created successfully.'
)

// Find the newly created team in the dropdown
const teamSelect = page.locator('select').filter({
  has: page.locator('option', { hasText: 'Select a team' }),
})

const newTeamOption = teamSelect.locator('option', {
  hasText: teamName,
})

await expect(newTeamOption).toHaveCount(1)

const teamId = await newTeamOption.getAttribute('value')
expect(teamId).toBeTruthy()

  await page.getByPlaceholder('Mission name').fill(missionName)
  await page.getByPlaceholder('Location', { exact: true }).fill('Truckee, CA')
  await teamSelect.selectOption(teamId!)

  // Submit the form
  await page.getByRole('button', { name: 'Create Mission' }).click()

  // Verify the mission was created
  await expect(
  page.locator('.mission-detail-name')
).toHaveText(missionName)

// Verify the mission was saved in the backend
const response = await request.get('http://127.0.0.1:8001/missions')

expect(response.ok()).toBeTruthy()

const data = await response.json()
const createdMission = data.missions.find(
  (mission: { name: string; location: string }) =>
    mission.name === missionName
)

expect(createdMission).toBeDefined()
expect(createdMission.location).toBe('Truckee, CA')

console.log('Missions API response:', JSON.stringify(data, null, 2))
})