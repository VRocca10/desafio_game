import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'

const port = process.env.MEMORY_PORT || '4175'
const origin = `http://127.0.0.1:${port}`
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--outDir', 'dist-test', '--host', '127.0.0.1', '--port', port, '--strictPort'], { stdio: 'ignore', windowsHide: true })
let browser
const label = process.env.MEMORY_LABEL || 'heap'
const cycles = Number(process.env.MEMORY_CYCLES || 100)
const muted = process.env.MEMORY_AUDIO !== '1'
try {
  if (!Number.isInteger(cycles) || cycles < 1) throw new Error('MEMORY_CYCLES must be a positive integer')
  let ready = false
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(`Preview server exited (${server.exitCode})`)
    try { if ((await fetch(origin)).ok) { ready = true; break } } catch {}
    await sleep(100)
  }
  if (!ready) throw new Error('Preview server did not become ready')
  browser = await chromium.launch()
  const page = await browser.newPage()
  await page.addInitScript((muted) => localStorage.setItem('pirate-battle:muted', String(muted)), muted)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${origin}/?scenario=stress`)
  const session = await page.context().newCDPSession(page)
  await session.send('HeapProfiler.enable')
  await mkdir(`docs/evidence/${label}`, { recursive: true })
  const reports = []
  async function snapshot(checkpoint) {
    await session.send('HeapProfiler.collectGarbage')
    const chunks = []
    const listener = ({ chunk }) => chunks.push(chunk)
    session.on('HeapProfiler.addHeapSnapshotChunk', listener)
    await session.send('HeapProfiler.takeHeapSnapshot')
    session.off('HeapProfiler.addHeapSnapshotChunk', listener)
    const raw = chunks.join('')
    await writeFile(`docs/evidence/${label}/${checkpoint}.heapsnapshot`, raw)
    const heap = JSON.parse(raw)
    const fields = heap.snapshot.meta.node_fields
    const stride = fields.length, nameIndex = fields.indexOf('name'), sizeIndex = fields.indexOf('self_size'), typeIndex = fields.indexOf('type')
    const types = heap.snapshot.meta.node_types[typeIndex]
    const groups = new Map()
    const nativeResources = { MessagePort: 0, ReadableStream: 0, AudioContext: 0 }
    for (let i = 0; i < heap.nodes.length; i += stride) {
      if (!['object', 'closure', 'native'].includes(types[heap.nodes[i + typeIndex]])) continue
      const name = heap.strings[heap.nodes[i + nameIndex]]
      if (types[heap.nodes[i + typeIndex]] === 'native' && Object.hasOwn(nativeResources, name)) nativeResources[name]++
      const item = groups.get(name) || { name, count: 0, bytes: 0 }
      item.count++; item.bytes += heap.nodes[i + sizeIndex]; groups.set(name, item)
    }
    const edgeFields = heap.snapshot.meta.edge_fields, edgeStride = edgeFields.length
    const edgeCountIndex = fields.indexOf('edge_count'), edgeNameIndex = edgeFields.indexOf('name_or_index'), edgeTypeIndex = edgeFields.indexOf('type')
    const edgeTypes = heap.snapshot.meta.edge_types[edgeTypeIndex]
    const edgeToIndex = edgeFields.indexOf('to_node')
    const offsets = new Map()
    let edgeOffset = 0, retainedSimulations = 0, whiteTexture = null
    for (let node = 0; node < heap.nodes.length; node += stride) {
      offsets.set(node, edgeOffset)
      const keys = new Set()
      const end = edgeOffset + heap.nodes[node + edgeCountIndex] * edgeStride
      for (; edgeOffset < end; edgeOffset += edgeStride) if (edgeTypes[heap.edges[edgeOffset + edgeTypeIndex]] === 'property') keys.add(heap.strings[heap.edges[edgeOffset + edgeNameIndex]])
      if (['enemies', 'bullets', 'player', 'spawnTime', 'onEvent'].every(key => keys.has(key))) retainedSimulations++
      if (keys.has('WHITE') && keys.has('EMPTY')) whiteTexture = node
    }
    const property = (node, name) => {
      if (node === null) return null
      const end = offsets.get(node) + heap.nodes[node + edgeCountIndex] * edgeStride
      for (let edge = offsets.get(node); edge < end; edge += edgeStride) {
        if (edgeTypes[heap.edges[edge + edgeTypeIndex]] === 'property' && heap.strings[heap.edges[edge + edgeNameIndex]] === name) return heap.edges[edge + edgeToIndex]
      }
      return null
    }
    const listeners = property(property(property(property(whiteTexture, 'WHITE'), '_source'), '_events'), 'change')
    let whiteTextureChangeListeners = 0
    if (whiteTexture === null) throw new Error('Shared Pixi Texture.WHITE not found in snapshot')
    if (listeners !== null) {
      if (heap.strings[heap.nodes[listeners + nameIndex]] !== 'Array') whiteTextureChangeListeners = 1
      else {
        const end = offsets.get(listeners) + heap.nodes[listeners + edgeCountIndex] * edgeStride
        for (let edge = offsets.get(listeners); edge < end; edge += edgeStride) if (edgeTypes[heap.edges[edge + edgeTypeIndex]] === 'element') whiteTextureChangeListeners++
      }
    }
    reports.push({ label: checkpoint, retainedSimulations, nativeResources, whiteTextureChangeListeners, usage: await session.send('Runtime.getHeapUsage'), dom: await session.send('Memory.getDOMCounters'), groups: [...groups.values()] })
    console.log(`Snapshot: ${checkpoint}`)
  }
  for (let cycle = 1; cycle <= cycles; cycle++) {
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    await page.locator('canvas').waitFor()
    await page.evaluate(() => window.__battle.runClock())
    await sleep(500)
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
    await sleep(300)
    if ([1, 5, 15, 30, 60, cycles].includes(cycle)) await snapshot(`cycle-${cycle}`)
  }
  const baseline = new Map(reports[0].groups.map(item => [item.name, item]))
  const growth = reports.at(-1).groups.map(item => ({ ...item, countDelta: item.count - (baseline.get(item.name)?.count || 0), bytesDelta: item.bytes - (baseline.get(item.name)?.bytes || 0) })).filter(item => item.countDelta > 0).sort((a, b) => b.bytesDelta - a.bytesDelta)
  await writeFile(`docs/evidence/${label}-summary.json`, JSON.stringify({ capturedAt: new Date().toISOString(), browser: browser.version(), cycles, audioMuted: muted, errors, reports, growth }, null, 2))
  console.log(JSON.stringify(growth.slice(0, 20)))
  const messages = reports.map(report => report.groups.find(group => group.name === 'MessageEvent')?.count || 0)
  if (messages.at(-1) > messages[0] + 2) throw new Error(`Service-worker messages accumulate after GC: ${messages.join(', ')}`)
  if (reports.some(report => report.retainedSimulations > 0)) throw new Error('Abandoned Simulation remains reachable after GC')
  for (const name of ['MessagePort', 'ReadableStream']) {
    const counts = reports.map(report => report.nativeResources[name])
    if (counts.at(-1) > counts[0] + 2) throw new Error(`${name} instances accumulate after GC: ${counts.join(', ')}`)
  }
  if (reports.some(report => report.nativeResources.AudioContext > 0)) throw new Error('Abandoned native AudioContext remains after GC')
  if (reports.at(-1).whiteTextureChangeListeners > reports[0].whiteTextureChangeListeners) throw new Error('Shared Pixi Texture.WHITE listeners accumulate after renderer teardown')
  if (errors.length) throw new Error(errors.join('\n'))
} finally { await browser?.close(); server.kill() }
