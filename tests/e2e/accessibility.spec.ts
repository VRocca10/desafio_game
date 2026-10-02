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

test('mobile steering turns both ways and combines movement with firing in both orientations', async ({ page, context }) => {
  await page.goto('/?scenario=arena')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('canvas')).toBeVisible()
  const session = await context.newCDPSession(page)
  for (const viewport of [{ width: 393, height: 851 }, { width: 851, height: 393 }]) {
    await page.setViewportSize(viewport)
    const point = async (name: string, id: number) => {
      const button = page.getByRole('button', { name, exact: true })
      await expect(button).toBeInViewport({ ratio: 1 })
      const box = await button.boundingBox()
      expect(box!.width).toBeGreaterThanOrEqual(44)
      expect(box!.height).toBeGreaterThanOrEqual(44)
      return { id, x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 }
    }
    for (const [name, sign] of [['Turn left', -1], ['Turn right', 1]] as const) {
      const before = await page.evaluate<number>('window.__battle.snapshot().player.angle')
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [await point(name, 1)] })
      await page.evaluate('window.__battle.advance(0.1)')
      const after = await page.evaluate<number>('window.__battle.snapshot().player.angle')
      expect((after - before) * sign).toBeGreaterThan(0)
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await page.evaluate('window.__battle.advance(0.1)')
      expect(await page.evaluate('window.__battle.snapshot().player.angle')).toBe(after)
    }
    const before = await page.evaluate<{ x: number; y: number }>('window.__battle.snapshot().player')
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [await point('Forward', 1), await point('Fire forward', 2)] })
    await page.evaluate('window.__battle.advance(0.1)')
    const after = await page.evaluate<{ x: number; y: number }>('(() => { const { x, y } = window.__battle.snapshot().player; return { x, y } })()')
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeGreaterThan(0)
    expect(await page.evaluate<number>('window.__battle.snapshot().bullets.length')).toBeGreaterThan(0)
    await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
    await page.evaluate('window.__battle.advance(0.4)')
    expect(await page.evaluate('(() => { const { x, y } = window.__battle.snapshot().player; return { x, y } })()')).toEqual(after)
    const canvas = await page.locator('canvas').boundingBox()
    const pixels = await page.locator('canvas').evaluate(node => { const canvas = node as unknown as { width: number; height: number }; return { width: canvas.width, height: canvas.height } })
    expect(canvas!.width / canvas!.height).toBeCloseTo(pixels.width / pixels.height, 1)
  }
})

test('control and network dialogs preserve keyboard focus and reset demo records', async ({ page }) => {
  await page.goto('/')
  const controls = page.getByRole('button', { name: 'Controls', exact: true })
  await controls.focus()
  await page.keyboard.press('Enter')
  const guide = page.getByRole('dialog', { name: "Captain's guide" })
  await expect(guide).toContainText('Fire left / right')
  await expect(guide).toContainText('Portrait and landscape')
  await page.keyboard.press('Tab')
  expect(await guide.evaluate(node => node.contains(node.ownerDocument.activeElement))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(controls).toBeFocused()
  await page.getByRole('button', { name: 'Network scenarios', exact: true }).click()
  const network = page.getByRole('dialog', { name: 'Network scenarios' })
  await network.getByRole('combobox', { name: 'Network scenario', exact: true }).selectOption('pages')
  await network.getByRole('button', { name: 'Reset demo data' }).click()
  await expect(network.getByRole('combobox', { name: 'Network scenario', exact: true })).toHaveValue('success')
  await network.getByRole('button', { name: 'Back', exact: true }).click()
  await page.getByRole('tab', { name: 'Ranking', exact: true }).click()
  await expect(page.getByText('Page 1 of 2')).toBeVisible()
})
