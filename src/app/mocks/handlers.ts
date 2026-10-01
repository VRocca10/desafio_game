import { delay, http, HttpResponse } from 'msw'
import { configurationKey, validResult } from '@/shared/matches/contracts'
import { currentEpoch, fixtures, insertRecord, readRecords } from './store'
import { readScenario } from './scenarios'

let requestNumber = 0
export function resetRequestSequence() { requestNumber = 0 }
async function network(resource: string) {
  const scenario = readScenario()
  const sequence = requestNumber++
  if (scenario === 'slow') await delay(1800)
  else if (scenario === 'variable') await delay([200, 1400, 450][sequence % 3])
  else if (scenario === 'out-of-order') await delay(sequence % 2 === 0 ? 1800 : 100)
  else if (scenario === 'timeout') await delay(6000)
  else await delay(100)
  if (scenario === 'connection') return HttpResponse.error()
  if (scenario === 'http-400') return HttpResponse.json({ message: 'Demo invalid request' }, { status: 400 })
  if (scenario === 'http-500' || scenario === 'outage' || scenario === `${resource}-error`) return HttpResponse.json({ message: 'Demo service unavailable' }, { status: 503 })
}
export const handlers = [
  http.get('/api/status', () => HttpResponse.json({ status: 'ready' })),
  http.post('/api/matches', async ({ request }) => {
    const epoch = currentEpoch()
    const scenario = readScenario()
    const failure = await network('registration')
    if (failure) return failure
    if (epoch !== currentEpoch()) return HttpResponse.json({ message: 'Demo data was reset' }, { status: 409 })
    let body: unknown
    try { body = await request.json() } catch { return HttpResponse.json({ message: 'Invalid JSON' }, { status: 400 }) }
    if (!validResult(body)) return HttpResponse.json({ message: 'Invalid match' }, { status: 400 })
    try {
      const record = insertRecord(body)
      if (scenario === 'post-commit-timeout') await delay(6000)
      return HttpResponse.json(record)
    } catch { return HttpResponse.json({ message: 'Unable to persist match' }, { status: 503 }) }
  }),
  ...(['ranking', 'history'] as const).map((kind) => http.get(`/api/${kind}`, async ({ request }) => {
    const url = new URL(request.url)
    const page = Math.max(1, Math.floor(Number(url.searchParams.get('page')) || 1))
    const playerId = url.searchParams.get('playerId') ?? ''
    const config = url.searchParams.get('config')
    const scenario = readScenario()
    const demo = scenario === 'empty' ? [] : [...fixtures(scenario === 'pages' ? 18 : 8, playerId, false), ...(scenario === 'pages' ? fixtures(18, playerId, true) : [])]

    const items = [...demo, ...readRecords()].filter((match) => kind === 'ranking' ? configurationKey(match.config) === config : match.player.id === playerId)
      .sort((a, b) => kind === 'ranking' ? b.score - a.score || a.endedAt.localeCompare(b.endedAt) || a.id.localeCompare(b.id) : b.endedAt.localeCompare(a.endedAt) || a.id.localeCompare(b.id))
    const failure = await network(kind)
    if (failure) return failure
    return HttpResponse.json({ items: items.slice((page - 1) * 5, page * 5), total: items.length, page, pageSize: 5 })
  })),
]
