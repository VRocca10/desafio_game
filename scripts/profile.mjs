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
  const hardware = process.env.PROFILE_GPU === '1'
  browser = await chromium.launch(hardware ? { args: ['--use-angle=d3d11', '--enable-gpu'] } : {})
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
  await page.addInitScript(() => {
    localStorage.setItem('pirate-battle:settings', JSON.stringify({ duration: 180, spawnInterval: 4 }))
    localStorage.setItem('pirate-battle:muted', 'true')
  })
  await page.goto('http://127.0.0.1:4175/?scenario=stress')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await page.locator('canvas').waitFor()
  const renderer = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    const ext = gl?.getExtension('WEBGL_debug_renderer_info')
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'Renderer information unavailable'
  })
  if (hardware && /swiftshader|software|llvmpipe|warp|basic render|unavailable/i.test(renderer)) throw new Error(`Hardware GPU required, received: ${renderer}`)
  console.log(`Renderer: ${renderer}`)
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
    const stages = window.__battle.timings()
    const summarize = (values) => { values.sort((a, b) => a - b); return { meanMs: values.reduce((sum, value) => sum + value, 0) / values.length, p95Ms: values[Math.floor(values.length * .95)] } }
    const stageTimings = Object.fromEntries(['simulationMs', 'renderMs', 'totalMs'].map((key) => [key, summarize(stages.map((item) => item[key]))]))
    let frameTime = 0
    const segments = [[], [], []]
    for (const interval of data.frames.slice(1)) { frameTime += interval; const index = Math.floor(frameTime / 60000); if (index < 3) segments[index].push(interval) }
    const windows = segments.map((intervals, index) => ({ startSecond: index * 60, averageFps: intervals.length * 1000 / intervals.reduce((sum, value) => sum + value, 0), ...summarize(intervals) }))
    return { wallSeconds: elapsed / 1000, averageFps: data.frames.length / (elapsed / 1000), p95FrameMs: frames[Math.floor(frames.length * 0.95)], stageTimings, windows, samples: data.entities, finalState: window.__battle.snapshot().status }
  })
  const session = await page.context().newCDPSession(page)
  const memory = []
  await mkdir('docs/evidence', { recursive: true })
  const label = process.env.PROFILE_LABEL || 'profile'
  if (!/^[a-zA-Z0-9_-]+$/.test(label)) throw new Error('PROFILE_LABEL must contain only letters, numbers, underscores or hyphens')
  if (label === 'profile') await writeFile('docs/evidence/frame-timings.json', JSON.stringify(timings, null, 2))
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
  const report = { capturedAt: new Date().toISOString(), environment: { os: `${os.platform()} ${os.release()}`, cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, totalMemoryGiB: os.totalmem() / 1024 ** 3, browser: browser.version(), renderer, viewport: '1280x720 @1', headless: true, hardwareRequested: hardware }, configuration: { duration: 180, spawnInterval: 4, seed: 'deterministic fixed spawn sequence', fixture: 'stress: stationary player with 100000 initial health to keep all 180 active seconds running', build: 'Vite optimized test build; same rules and renderer, observation/clock hook enabled', audioMuted: true }, timings, memory }
  await mkdir('docs/evidence', { recursive: true })
  await writeFile(`docs/evidence/${label}.json`, JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ fps: timings.averageFps, p95: timings.p95FrameMs, finalState: timings.finalState, heapBytes: memory.map((item) => item.usedSize) }))
} finally {
  await browser?.close()
  server.kill()
}
