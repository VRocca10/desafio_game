import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import { setTimeout as sleep } from 'node:timers/promises'

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--outDir', 'dist-test', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], { stdio: 'ignore', windowsHide: true })
let browser
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch('http://127.0.0.1:4175')).ok) break } catch {  }
    await sleep(100)
  }
  browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
  await page.addInitScript(() => {
    localStorage.setItem('pirate-battle:settings', JSON.stringify({ duration: 180, spawnInterval: 4 }))
    localStorage.setItem('pirate-battle:muted', 'true')
  })
  await page.goto('http://127.0.0.1:4175/?scenario=stress')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await page.locator('canvas').waitFor()
  await page.evaluate(() => {
    window.__battle.runClock()
    window.__profile = { frames: [], entities: [], started: performance.now(), previous: performance.now(), stopped: false }
    const frame = (now) => {
      const data = window.__profile
      if (data.stopped) return
      data.frames.push(now - data.previous); data.previous = now
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  })
  for (let second = 0; second < 180; second++) {
    await sleep(1000)
    await page.evaluate(() => {
      const state = window.__battle.snapshot()
      window.__profile.entities.push({ elapsed: state.elapsed, ships: state.enemies.length + 1, bullets: state.bullets.length })
    })
    if ((second + 1) % 30 === 0) console.log(`Profile: ${second + 1}/180 seconds`)
  }
  const timings = await page.evaluate(() => {
    const data = window.__profile; data.stopped = true
    const frames = data.frames.slice(1).sort((a, b) => a - b)
    const elapsed = performance.now() - data.started
    return { wallSeconds: elapsed / 1000, averageFps: data.frames.length / (elapsed / 1000), p95FrameMs: frames[Math.floor(frames.length * 0.95)], samples: data.entities, finalState: window.__battle.snapshot().status }
  })
  const session = await page.context().newCDPSession(page)
  const memory = []
  await mkdir('docs/evidence', { recursive: true })
  await writeFile('docs/evidence/frame-timings.json', JSON.stringify(timings, null, 2))
  await page.getByRole('dialog').getByRole('button', { name: 'Main Menu', exact: true }).click()
  for (let cycle = 0; cycle < 5; cycle++) {
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    await page.locator('canvas').waitFor()
    await page.evaluate(() => window.__battle.runClock())
    await sleep(3000)
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
    await session.send('HeapProfiler.collectGarbage')
    memory.push({ cycle: cycle + 1, ...await session.send('Runtime.getHeapUsage'), ...await session.send('Memory.getDOMCounters') })
  }
  const report = { capturedAt: new Date().toISOString(), environment: { os: `${os.platform()} ${os.release()}`, cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, totalMemoryGiB: os.totalmem() / 1024 ** 3, browser: browser.version(), viewport: '1280x720 @1', headless: true }, configuration: { duration: 180, spawnInterval: 4, seed: 'deterministic fixed spawn sequence', fixture: 'stress: stationary player with 100000 initial health to keep all 180 active seconds running', build: 'Vite optimized test build; same rules and renderer, observation/clock hook enabled', audioMuted: true }, timings, memory }
  await mkdir('docs/evidence', { recursive: true })
  await writeFile('docs/evidence/profile.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ fps: timings.averageFps, p95: timings.p95FrameMs, finalState: timings.finalState, heapBytes: memory.map((item) => item.usedSize) }))
} finally {
  await browser?.close()
  server.kill()
}
