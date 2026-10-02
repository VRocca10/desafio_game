import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--outDir', 'dist-test', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], { stdio: 'ignore', windowsHide: true })
let browser
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch('http://127.0.0.1:4175')).ok) break } catch {} await sleep(100) }
  browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu'] })
  await mkdir('docs/evidence/ui', { recursive: true })
  for (const [name, viewport] of [['desktop', { width: 1800, height: 1000 }], ['mobile', { width: 393, height: 851 }]]) {
    const page = await browser.newPage({ viewport })
    await page.addInitScript(() => localStorage.setItem('pirate-battle:muted', 'true'))
    await page.goto('http://127.0.0.1:4175/?scenario=shooter')
    await page.getByRole('button', { name: 'Play', exact: true }).waitFor()
    await page.screenshot({ path: `docs/evidence/ui/${name}-menu.png`, fullPage: true })
    await page.getByRole('button', { name: 'Options', exact: true }).click()
    await page.locator('.option-field img').first().evaluate(img => img.decode())
    await sleep(150)
    await page.screenshot({ path: `docs/evidence/ui/${name}-options.png`, fullPage: true })
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
    await page.getByRole('tab', { name: 'Ranking', exact: true }).click()
    await page.locator('[data-match-id]').first().waitFor()
    await page.screenshot({ path: `docs/evidence/ui/${name}-ranking.png`, fullPage: true })
    await page.getByRole('tab', { name: 'Harbor' }).click()
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    await page.locator('canvas').waitFor()
    await page.evaluate(() => window.__battle.advance(0))
    await page.screenshot({ path: `docs/evidence/ui/${name}-battle.png` })
    await page.evaluate(() => window.__battle.advance(30))
    await page.getByText('Match registered.', { exact: true }).waitFor()
    await page.getByRole('dialog').getByRole('button', { name: 'Main Menu', exact: true }).click()
    await page.getByRole('tab', { name: 'Match History', exact: true }).click()
    await page.locator('[data-match-id]').first().waitFor()
    await page.screenshot({ path: `docs/evidence/ui/${name}-history.png`, fullPage: true })
    await page.close()
  }
} finally { await browser?.close(); server.kill() }
