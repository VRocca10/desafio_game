import { expect, test } from '@playwright/test'

test('keyboard pause traps focus, Escape resumes and restores focus', async ({ page }) => {
  await page.goto('/?scenario=arena')
  await page.getByRole('button', { name: 'Play', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('canvas')).toBeVisible()
  await page.keyboard.press('Escape')
  const dialog = page.getByRole('dialog', { name: 'Battle paused' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Resume' })).toBeFocused()
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate(node => node.contains(node.ownerDocument.activeElement))).toBe(true)
  }
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Shift+Tab')
    expect(await dialog.evaluate(node => node.contains(node.ownerDocument.activeElement))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeFocused()
})

test('rotation between portrait and landscape keeps controls visible and releases touches', async ({ page, context }) => {
  await page.goto('/?scenario=arena')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('canvas')).toBeVisible()
  const session = await context.newCDPSession(page)
  for (const viewport of [{ width: 393, height: 851 }, { width: 851, height: 393 }]) {
    await page.setViewportSize(viewport)
    const button = page.getByRole('button', { name: 'Forward', exact: true })
    await expect(button).toBeInViewport({ ratio: 1 })
    await expect(page.getByRole('button', { name: 'Fire right', exact: true })).toBeInViewport({ ratio: 1 })
    const box = await button.boundingBox()
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 }] })
    await page.evaluate('window.__battle.advance(0.1)')
    await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
    const position = await page.evaluate('window.__battle.snapshot().player')
    await page.evaluate('window.__battle.advance(0.1)')
    expect(await page.evaluate('window.__battle.snapshot().player')).toEqual(position)
  }
})
