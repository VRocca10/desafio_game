import { readFile, writeFile } from 'node:fs/promises'

const heap = JSON.parse(await readFile(process.argv[2] || 'docs/evidence/heap/cycle-15.heapsnapshot', 'utf8'))
const nf = heap.snapshot.meta.node_fields, ef = heap.snapshot.meta.edge_fields
const ns = nf.length, es = ef.length
const nodeTypeIndex = nf.indexOf('type'), nodeTypes = heap.snapshot.meta.node_types[nodeTypeIndex]
const ni = nf.indexOf('name'), ec = nf.indexOf('edge_count'), ti = ef.indexOf('type'), to = ef.indexOf('to_node'), en = ef.indexOf('name_or_index')
const edgeTypes = heap.snapshot.meta.edge_types[ti]
const count = heap.nodes.length / ns
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
const names = ['MessageEvent', 'MessagePort', 'Generator', 'AudioContext', 'ResizeObserver', 'PerformanceResourceTiming']
const paths = []
for (const name of names) {
  let found = 0
  for (let n = 0; n < count && found < 3; n++) {
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
await writeFile('docs/evidence/heap-retainers.json', JSON.stringify(paths, null, 2))
console.log(JSON.stringify(paths.map(({ name, path }) => ({ name, pathLength: path.length }))))
