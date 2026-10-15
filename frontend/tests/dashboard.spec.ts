import { test, expect } from '@playwright/test'

test.describe('Mission Tracker Dashboard', () => {
  test('displays dashboard and mission statistics', async ({ page }) => {
    await page.goto('/')

    await expect(
      page.getByRole('heading', {
        name: 'Mission Tracker',
        exact: true,
      })
    ).toBeVisible()

    await expect(page.getByText('Active Missions', { exact: true })).toBeVisible()
    await expect(page.getByText('Completed Missions', { exact: true })).toBeVisible()
    await expect(page.getByText('Total Missions', { exact: true })).toBeVisible()
    await expect(page.getByText('Responders Deployed', { exact: true })).toBeVisible()
  })

  test('displays mission map', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('.mission-map-container')).toBeVisible()
  })
})