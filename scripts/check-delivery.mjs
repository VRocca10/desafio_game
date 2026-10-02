import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'

const remote = process.argv[2]
const url = remote || 'http://127.0.0.1:4177'
const label = remote ? 'deployed-smoke' : 'production-smoke'
const server = remote ? null : spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4177', '--strictPort'], { stdio: 'pipe', windowsHide: true })
const report = { capturedAt: new Date().toISOString(), url, checks: [], pageErrors: [], status: 'running' }
let browser
try {
  if (server) {
    for (let i = 0; i < 100; i++) {
      if (server.exitCode !== null) throw new Error('Production preview failed to start')
      try { if ((await fetch(url)).ok) break } catch {}
      await sleep(100)
    }
  }
  browser = await chromium.launch()
  report.browser = browser.version()
  const context = await browser.newContext({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await context.tracing.start({ screenshots: true, snapshots: true })
  const page = await context.newPage()
  page.on('pageerror', error => report.pageErrors.push(error.message))
  await page.addInitScript(() => localStorage.setItem('pirate-battle:muted', 'true'))
  const response = await page.goto(url)
  assert.equal(response.status(), 200)
  await page.getByRole('button', { name: 'Play', exact: true }).waitFor()
  const assets = await page.locator('script[type="module"][src]').evaluateAll(nodes => nodes.map(node => node.getAttribute('src')))
  const localHtml = await readFile('dist/index.html', 'utf8')
  report.productionAssets = assets
  report.matchesLocalProductionAssets = assets.every(asset => localHtml.includes(asset))
  await mkdir('docs/evidence/ui', { recursive: true })
  await page.screenshot({ path: `docs/evidence/ui/${label}-menu.png`, fullPage: true })
  report.menuButtons = await page.getByRole('button').allTextContents()
  await page.getByRole('button', { name: 'Controls', exact: true }).click()
  await page.getByRole('dialog', { name: "Captain's guide" }).waitFor()
  await page.getByRole('dialog').getByRole('button', { name: 'Back', exact: true }).click()
  report.checks.push('Direct load and Controls dialog')
  await page.getByRole('button', { name: 'Network scenarios', exact: true }).click()
  await page.getByRole('button', { name: 'Reset demo data' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Back', exact: true }).click()
  await page.getByRole('button', { name: 'Options', exact: true }).click()
  await page.getByLabel('Game session time', { exact: true }).fill('60')
  await page.getByLabel('Enemy spawn time', { exact: true }).fill('10')
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
  await page.getByRole('tab', { name: 'Ranking', exact: true }).click()
  await page.getByText('No voyages yet.', { exact: true }).waitFor()
  const worker = await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.active?.scriptURL)
  assert.ok(worker?.endsWith('/mockServiceWorker.js'))
  report.checks.push('Published/production MSW query and scenario reset')
  await page.getByRole('tab', { name: 'Harbor' }).click()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await page.locator('canvas').waitFor()
  assert.equal(await page.evaluate(() => '__battle' in window), false)
  const portrait = await page.locator('canvas').boundingBox()
  assert.ok(Math.abs(portrait.width / portrait.height - 1.6) < .02)
  await page.keyboard.down('w'); await sleep(200); await page.keyboard.up('w')
  await page.keyboard.down('q'); await sleep(200); await page.keyboard.up('q')
  await page.setViewportSize({ width: 851, height: 393 })
  for (const name of ['Forward', 'Turn left', 'Turn right', 'Fire forward', 'Fire left', 'Fire right']) {
    const rect = await page.getByRole('button', { name, exact: true }).boundingBox()
    assert.ok(rect && rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= 851 && rect.y + rect.height <= 393, `${name} outside landscape viewport`)
  }
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Options', exact: true }).click()
  await page.getByRole('button', { name: 'Increase game session time' }).click()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  report.checks.push('Portrait proportions, landscape controls, pause Options and no test instrumentation')
  console.log(`${label}: waiting for a real, uninstrumented round to finish`)
  await page.getByRole('dialog', { name: 'Battle result' }).waitFor({ timeout: 75000 })
  await page.getByText('Match registered.', { exact: true }).waitFor({ timeout: 10000 })
  await page.reload()
  await page.getByRole('button', { name: 'Last result', exact: true }).click()
  await page.getByRole('heading', { name: 'Battle complete' }).waitFor()
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
  await page.getByRole('tab', { name: 'Match History', exact: true }).click()
  await page.locator('[data-match-id]').waitFor()
  assert.equal(await page.locator('[data-match-id]').count(), 1)
  await page.getByRole('tab', { name: 'Harbor' }).click()
  await page.getByRole('button', { name: 'Options', exact: true }).click()
  assert.equal(await page.getByLabel('Game session time', { exact: true }).inputValue(), '70')
  await page.getByLabel('Game session time', { exact: true }).fill('60')
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
  await page.getByRole('tab', { name: 'Ranking', exact: true }).click()
  await page.locator('[data-match-id]').waitFor()
  assert.equal(await page.locator('[data-match-id]').count(), 1)
  report.checks.push('Real round registration, refresh, last result, history/ranking consistency, next-round settings')
  assert.deepEqual(report.pageErrors, [])
  report.status = 'passed'
  await context.tracing.stop()
  console.log(`${label}: all checks passed; matches local assets: ${report.matchesLocalProductionAssets}`)
} catch (error) {
  report.status = 'failed'; report.error = String(error)
  await mkdir('docs/evidence/failure-traces', { recursive: true })
  await browser?.contexts()[0]?.tracing.stop({ path: `docs/evidence/failure-traces/${label}.zip` })
  console.error(report.error)
  process.exitCode = 1
} finally {
  await mkdir('docs/evidence', { recursive: true })
  await writeFile(`docs/evidence/${label}.json`, JSON.stringify(report, null, 2))
  await browser?.close()
  server?.kill()
}
