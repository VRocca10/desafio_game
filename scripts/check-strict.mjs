import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4176', '--strictPort'], { stdio: 'ignore', windowsHide: true })
let browser
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch('http://127.0.0.1:4176')).ok) break } catch {  }
    await sleep(100)
  }
  browser = await chromium.launch()
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('http://127.0.0.1:4176')
  for (let cycle = 0; cycle < 5; cycle++) {
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    await page.locator('canvas').waitFor()
    if (await page.locator('canvas').count() !== 1) throw new Error('Duplicate canvas')
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
    if (await page.locator('canvas').count() !== 0) throw new Error('Leaked canvas')
  }
  if (errors.length) throw new Error(errors.join('\n'))
  await mkdir('docs/evidence', { recursive: true })
  await writeFile('docs/evidence/strict-mode.json', JSON.stringify({ capturedAt: new Date().toISOString(), mode: 'Vite development, React StrictMode effect replay enabled', cycles: 5, errors, canvasCleanup: 'passed', browser: browser.version() }, null, 2))
  console.log('Strict Mode: five start/exit cycles passed without page errors or duplicate canvases.')
} finally { await browser?.close(); server.kill() }
