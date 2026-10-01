import { expect, test } from '@playwright/test'

test('menu, stable arena and result visual baselines', async ({ page }) => {
  await page.addInitScript("localStorage.setItem('pirate-battle:muted', 'true')")
  await page.goto('/?scenario=shooter')
  await expect(page.getByRole('heading', { name: 'Pirate Battle' })).toBeVisible()
  await expect(page).toHaveScreenshot('menu.png', { fullPage: true })
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('canvas')).toBeVisible()
  await page.evaluate('window.__battle.advance(0)')
  await expect(page).toHaveScreenshot('arena.png')
  await page.evaluate('window.__battle.advance(30)')
  await expect(page.getByText('Match registered.', { exact: true })).toBeVisible()
  await expect(page).toHaveScreenshot('result.png')
})
