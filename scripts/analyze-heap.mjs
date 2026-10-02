import { readFile, writeFile } from 'node:fs/promises'

const heap = JSON.parse(await readFile(process.argv[2] || 'docs/evidence/heap/cycle-100.heapsnapshot', 'utf8'))
const baselinePath = process.argv[3] || (!process.argv[2] ? 'docs/evidence/heap/cycle-1.heapsnapshot' : null)
const baseline = baselinePath ? JSON.parse(await readFile(baselinePath, 'utf8')) : null
const nf = heap.snapshot.meta.node_fields, ef = heap.snapshot.meta.edge_fields
const ns = nf.length, es = ef.length
const nodeTypeIndex = nf.indexOf('type'), nodeTypes = heap.snapshot.meta.node_types[nodeTypeIndex]
const ni = nf.indexOf('name'), ec = nf.indexOf('edge_count'), ti = ef.indexOf('type'), to = ef.indexOf('to_node'), en = ef.indexOf('name_or_index')
const edgeTypes = heap.snapshot.meta.edge_types[ti]
const count = heap.nodes.length / ns
const idIndex = nf.indexOf('id')
const oldIds = new Set()
if (baseline) {
  const stride = baseline.snapshot.meta.node_fields.length
  const id = baseline.snapshot.meta.node_fields.indexOf('id')
  for (let n = 0; n < baseline.nodes.length; n += stride) oldIds.add(baseline.nodes[n + id])
}
const offsets = new Uint32Array(count)
let offset = 0
for (let n = 0; n < count; n++) { offsets[n] = offset; offset += heap.nodes[n * ns + ec] * es }
const parent = new Int32Array(count).fill(-1), via = new Int32Array(count).fill(-1)
const queue = [0]; parent[0] = 0
for (let q = 0; q < queue.length; q++) {
  const n = queue[q]
  for (let e = offsets[n]; e < offsets[n] + heap.nodes[n * ns + ec] * es; e += es) {
    if (edgeTypes[heap.edges[e + ti]] === 'weak') continue
    const target = heap.edges[e + to] / ns
    if (parent[target] !== -1) continue
    parent[target] = n; via[target] = e; queue.push(target)
  }
}
const names = ['MessageEvent', 'MessagePort', 'Generator', 'AudioContext', 'ResizeObserver', 'PerformanceResourceTiming', 'ReadableStream', 'blink::NetworkResourcesData::ResourceData', 'blink::MediaPlayer']
if (process.env.HEAP_NAMES) names.push(...process.env.HEAP_NAMES.split(','))
const paths = []
for (const name of names) {
  let found = 0
  for (let n = 0; n < count && found < 3; n++) {
    if (oldIds.has(heap.nodes[n * ns + idIndex])) continue
    if (heap.strings[heap.nodes[n * ns + ni]] !== name || parent[n] < 0 || !['object', 'native'].includes(nodeTypes[heap.nodes[n * ns + nodeTypeIndex]])) continue
    const path = []; let current = n
    while (current !== 0) {
      const e = via[current], type = edgeTypes[heap.edges[e + ti]]
      path.unshift({ node: heap.strings[heap.nodes[current * ns + ni]], edge: ['element', 'hidden'].includes(type) ? heap.edges[e + en] : heap.strings[heap.edges[e + en]], type })
      current = parent[current]
    }
    paths.push({ name, path }); found++
  }
}
await writeFile(process.env.HEAP_RETAINERS_OUTPUT || 'docs/evidence/heap-retainers.json', JSON.stringify(paths, null, 2))
console.log(JSON.stringify(paths.map(({ name, path }) => ({ name, pathLength: path.length }))))
