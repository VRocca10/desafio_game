import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--outDir', 'dist-test', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], { stdio: 'ignore', windowsHide: true })
let browser
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch('http://127.0.0.1:4175')).ok) break } catch {} await sleep(100) }
  browser = await chromium.launch()
  const page = await browser.newPage()
  await page.addInitScript(() => localStorage.setItem('pirate-battle:muted', 'true'))
  await page.goto('http://127.0.0.1:4175/?scenario=stress')
  const session = await page.context().newCDPSession(page)
  await session.send('HeapProfiler.enable')
  await mkdir('docs/evidence/heap', { recursive: true })
  const reports = []
  async function snapshot(label) {
    await session.send('HeapProfiler.collectGarbage')
    const chunks = []
    const listener = ({ chunk }) => chunks.push(chunk)
    session.on('HeapProfiler.addHeapSnapshotChunk', listener)
    await session.send('HeapProfiler.takeHeapSnapshot')
    session.off('HeapProfiler.addHeapSnapshotChunk', listener)
    const raw = chunks.join('')
    await writeFile(`docs/evidence/heap/${label}.heapsnapshot`, raw)
    const heap = JSON.parse(raw)
    const fields = heap.snapshot.meta.node_fields
    const stride = fields.length, nameIndex = fields.indexOf('name'), sizeIndex = fields.indexOf('self_size'), typeIndex = fields.indexOf('type')
    const types = heap.snapshot.meta.node_types[typeIndex]
    const groups = new Map()
    for (let i = 0; i < heap.nodes.length; i += stride) {
      if (!['object', 'closure', 'native'].includes(types[heap.nodes[i + typeIndex]])) continue
      const name = heap.strings[heap.nodes[i + nameIndex]]
      const item = groups.get(name) || { name, count: 0, bytes: 0 }
      item.count++; item.bytes += heap.nodes[i + sizeIndex]; groups.set(name, item)
    }
    const edgeFields = heap.snapshot.meta.edge_fields, edgeStride = edgeFields.length
    const edgeCountIndex = fields.indexOf('edge_count'), edgeNameIndex = edgeFields.indexOf('name_or_index'), edgeTypeIndex = edgeFields.indexOf('type')
    const edgeTypes = heap.snapshot.meta.edge_types[edgeTypeIndex]
    let edgeOffset = 0, retainedSimulations = 0
    for (let node = 0; node < heap.nodes.length; node += stride) {
      const keys = new Set()
      const end = edgeOffset + heap.nodes[node + edgeCountIndex] * edgeStride
      for (; edgeOffset < end; edgeOffset += edgeStride) if (edgeTypes[heap.edges[edgeOffset + edgeTypeIndex]] === 'property') keys.add(heap.strings[heap.edges[edgeOffset + edgeNameIndex]])
      if (['enemies', 'bullets', 'player', 'spawnTime', 'onEvent'].every(key => keys.has(key))) retainedSimulations++
    }
    reports.push({ label, retainedSimulations, usage: await session.send('Runtime.getHeapUsage'), dom: await session.send('Memory.getDOMCounters'), groups: [...groups.values()] })
    console.log(`Snapshot: ${label}`)
  }
  for (let cycle = 1; cycle <= 15; cycle++) {
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    await page.locator('canvas').waitFor()
    await page.evaluate(() => window.__battle.runClock())
    await sleep(500)
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
    await sleep(300)
    if ([1, 5, 15].includes(cycle)) await snapshot(`cycle-${cycle}`)
  }
  const baseline = new Map(reports[0].groups.map(item => [item.name, item]))
  const growth = reports.at(-1).groups.map(item => ({ ...item, countDelta: item.count - (baseline.get(item.name)?.count || 0), bytesDelta: item.bytes - (baseline.get(item.name)?.bytes || 0) })).filter(item => item.countDelta > 0).sort((a, b) => b.bytesDelta - a.bytesDelta)
  await writeFile('docs/evidence/heap-summary.json', JSON.stringify({ reports, growth }, null, 2))
  console.log(JSON.stringify(growth.slice(0, 20)))
  const messages = reports.map(report => report.groups.find(group => group.name === 'MessageEvent')?.count || 0)
  if (messages.at(-1) > messages[0] + 2) throw new Error(`Service-worker messages accumulate after GC: ${messages.join(', ')}`)
  if (reports.some(report => report.retainedSimulations > 0)) throw new Error('Abandoned Simulation remains reachable after GC')
} finally { await browser?.close(); server.kill() }
