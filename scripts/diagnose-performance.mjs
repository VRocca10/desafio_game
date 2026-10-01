import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--outDir', 'dist-test', '--port', '4175', '--host', '127.0.0.1', '--strictPort'], { stdio: 'ignore', windowsHide: true })
let browser
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch('http://127.0.0.1:4175')).ok) break } catch {} await sleep(100) }
  browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  await page.addInitScript(() => localStorage.setItem('pirate-battle:muted', 'true'))
  await page.goto('http://127.0.0.1:4175/?scenario=stress')
  const sample = () => page.evaluate(() => new Promise((resolve) => {
    const start = performance.now(); let previous = start; const frames = []
    const step = (now) => { frames.push(now - previous); previous = now; if (now - start < 10000) requestAnimationFrame(step); else { frames.sort((a, b) => a - b); resolve({ fps: frames.length / ((now - start) / 1000), p95: frames[Math.floor(frames.length * .95)] }) } }
    requestAnimationFrame(step)
  }))
  const menu = await sample()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await page.locator('canvas').waitFor()
  await page.evaluate(() => window.__battle.runClock())
  const renderer = await page.evaluate(() => {
    const canvas = document.querySelector('canvas'); const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    const ext = gl?.getExtension('WEBGL_debug_renderer_info')
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'Renderer information unavailable'
  })
  const battle = await sample()
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
  const session = await page.context().newCDPSession(page)
  const memory = []
  for (let cycle = 0; cycle < 15; cycle++) {
    await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.locator('canvas').waitFor()
    await page.evaluate(() => window.__battle.runClock()); await sleep(500)
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
    await session.send('HeapProfiler.collectGarbage')
    memory.push({ cycle: cycle + 1, ...await session.send('Runtime.getHeapUsage'), ...await session.send('Memory.getDOMCounters') })
  }
  const report = { renderer, menu, battle, memory }
  await mkdir('docs/evidence', { recursive: true }); await writeFile('docs/evidence/performance-diagnostic.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
} finally { await browser?.close(); server.kill() }
