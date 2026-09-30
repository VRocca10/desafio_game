import { expect, test } from '@playwright/test'
test('production build starts with the browser mock API', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Pirate Battle' })).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('Mock API ready.')
  const asset = await page.request.get('/assets/spritesheet/ui_sheet.json')
  expect(asset.ok()).toBeTruthy()
  expect(await asset.json()).toHaveProperty('frames.panel_menu')
  await page.reload()
  await expect(page.getByRole('status')).toHaveText('Mock API ready.')
  expect(errors).toEqual([])
})
