import { expect, test } from '@playwright/test'

test('starts, pauses, resumes and cleans up repeated visits', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  for (let visit = 0; visit < 3; visit++) {
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    await expect(page.getByRole('img', { name: 'Naval battle arena' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: 'Pause', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Battle paused' })).toBeVisible()
    const paused = await page.locator('dl dd').allTextContents()
    await page.waitForTimeout(1100)
    expect(await page.locator('dl dd').allTextContents()).toEqual(paused)
    await page.getByRole('button', { name: 'Resume', exact: true }).click()
    await page.evaluate("window.dispatchEvent(new Event('blur'))")
    await expect(page.getByRole('heading', { name: 'Battle paused' })).toBeVisible()
    await page.getByRole('button', { name: 'Resume', exact: true }).click()
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
    await expect(page.locator('canvas')).toHaveCount(0)
  }
  expect(errors).toEqual([])
})

test('reports asset failure and retries loading', async ({ page, context }) => {
  await context.route('**/assets/png/retina/ships/ship_5.png', (route) => route.abort())
  await page.goto('/')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Unable to load the arena')
  await context.unroute('**/assets/png/retina/ships/ship_5.png')
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.locator('canvas')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled()
})

test('leaving during image loading never attaches an abandoned canvas', async ({ page, context }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await context.route('**/assets/png/retina/ships/ship_5.png', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700))
    await route.continue()
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByText('Preparing your voyage…')).toBeVisible()
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
  await page.waitForTimeout(900)
  await expect(page.locator('canvas')).toHaveCount(0)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('canvas')).toHaveCount(1)
  expect(errors).toEqual([])
})
