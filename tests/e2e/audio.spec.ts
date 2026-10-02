import { expect, test } from '@playwright/test'


const probe = `(() => {
  const state = window.__audioProbe = { active: new Set(), starts: [], contexts: [] };
  const Original = window.AudioContext;
  window.AudioContext = class extends Original {
    constructor(...args) { super(...args); state.contexts.push(this); }
    createBufferSource() {
      const source = super.createBufferSource();
      const start = source.start.bind(source), stop = source.stop.bind(source);
      source.start = (...args) => {
        start(...args); state.active.add(source);
        state.starts.push({ loop: source.loop, duration: source.buffer.duration });
        source.addEventListener('ended', () => state.active.delete(source), { once: true });
      };
      source.stop = (...args) => { stop(...args); state.active.delete(source); };
      return source;
    }
  };
})();`

test('real audio follows movement, fire, mute, pause and exit', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(probe)
  await page.goto('/')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('canvas')).toBeVisible()
  const loopCount = () => page.evaluate<number>('[...window.__audioProbe.active].filter(source => source.loop).length')
  await expect.poll(loopCount).toBe(1)
  await page.keyboard.down('w')
  await expect.poll(loopCount).toBe(2)
  const shots = () => page.evaluate<number>('window.__audioProbe.starts.filter(source => !source.loop).length')
  const before = await shots()
  await page.keyboard.down('Space')
  await expect.poll(shots).toBeGreaterThan(before)
  await page.keyboard.up('Space')
  await page.keyboard.up('w')
  await expect.poll(loopCount).toBe(1)
  const mute = page.getByRole('button', { name: 'Mute sound' })
  await mute.click()
  await expect(mute).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate<number>('window.__audioProbe.active.size')).toBe(0)
  const mutedShots = await shots()
  await page.keyboard.down('q')
  await page.waitForTimeout(200)
  await page.keyboard.up('q')
  expect(await shots()).toBe(mutedShots)
  await mute.click()
  await expect.poll(loopCount).toBe(1)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect.poll(loopCount).toBe(0)
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  await expect.poll(loopCount).toBe(1)
  await page.evaluate("window.dispatchEvent(new Event('blur'))")
  expect(await page.evaluate<number>('window.__audioProbe.active.size')).toBe(0)
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
  await expect.poll(() => page.evaluate<boolean>('window.__audioProbe.contexts.every(context => context.state === "closed")')).toBe(true)
  expect(await page.evaluate<number>('window.__audioProbe.active.size')).toBe(0)
  expect(errors).toEqual([])
})

test('mute persists and missing audio never prevents playing', async ({ page, context }) => {
  await context.route('**/assets/sounds/*.wav', (route) => route.fulfill({ status: 404, body: 'Unavailable' }))
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('canvas')).toBeVisible()
  await expect(page.getByRole('status')).toContainText('Some sounds are unavailable')
  await page.getByRole('button', { name: 'Mute sound' }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Mute sound' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled()
  expect(errors).toEqual([])
})

test('menu ambience follows focus, shares mute and stops before battle audio starts', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(probe)
  await page.goto('/')
  await page.getByRole('button', { name: 'Controls', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Back', exact: true }).click()
  const isMenuPlaying = () => page.evaluate<boolean>('!document.querySelector("audio").paused')
  await expect.poll(isMenuPlaying).toBe(true)
  expect(await page.locator('audio').getAttribute('loop')).not.toBeNull()
  await page.evaluate("window.dispatchEvent(new Event('blur'))")
  await expect.poll(isMenuPlaying).toBe(false)
  await page.evaluate("window.dispatchEvent(new Event('focus'))")
  await expect.poll(isMenuPlaying).toBe(true)

  await page.evaluate('window.__menuAudio = document.querySelector("audio")')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('canvas')).toBeVisible()
  expect(await page.evaluate<boolean>('window.__menuAudio.paused')).toBe(true)
  const loopCount = () => page.evaluate<number>('[...window.__audioProbe.active].filter(source => source.loop).length')
  await expect.poll(loopCount).toBe(1)
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
  await expect.poll(isMenuPlaying).toBe(true)
  expect(await loopCount()).toBe(0)

  await page.getByRole('button', { name: 'Options', exact: true }).click()
  await page.getByRole('button', { name: 'Mute sound' }).click()
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
  await expect.poll(isMenuPlaying).toBe(false)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('canvas')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mute sound' })).toHaveAttribute('aria-pressed', 'true')
  expect(await loopCount()).toBe(0)
  await page.getByRole('button', { name: 'Mute sound' }).click()
  await expect.poll(loopCount).toBe(1)
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
  await page.getByRole('button', { name: 'Options', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Mute sound' })).toHaveAttribute('aria-pressed', 'false')
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
  await page.getByRole('button', { name: 'Controls', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Back', exact: true }).click()
  await expect.poll(isMenuPlaying).toBe(true)
  await page.getByRole('button', { name: 'Options', exact: true }).click()
  await page.getByRole('button', { name: 'Mute sound' }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Options', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Mute sound' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
  await page.getByRole('button', { name: 'Controls', exact: true }).click()
  await expect.poll(isMenuPlaying).toBe(false)
  expect(errors).toEqual([])
})
