import { defaultConfig } from '@/shared/game/config'
import { validResult, type MatchResult } from '@/shared/matches/contracts'
const key = 'pirate-battle:server-matches'
let memory: MatchResult[] = []
let epoch = 0
export function currentEpoch() { return epoch }
export function readRecords() {
  try { const data: unknown = JSON.parse(localStorage.getItem(key) ?? '[]'); if (Array.isArray(data)) memory = data.filter(validResult) } catch {  }
  return memory
}
export function insertRecord(result: MatchResult) {
  const records = readRecords()
  const existing = records.find((record) => record.id === result.id)
  if (existing) return existing
  memory = [...records, result]
  localStorage.setItem(key, JSON.stringify(memory))
  return result
}
export function resetRecords() { epoch++; memory = []; try { localStorage.removeItem(key) } catch {  } }
export function fixtures(count: number, playerId: string, history: boolean): MatchResult[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `fixture-${history ? playerId : 'rival'}-${index}`,
    player: { id: history ? playerId : `rival-${index}`, name: history ? 'Captain (demo)' : `Captain ${['Reed', 'Morgan', 'Storm', 'Finch'][index % 4]}` },
    endedAt: new Date(Date.UTC(2026, 0, 1, 12, index)).toISOString(), score: count - index,
    duration: 90, reason: 'time', config: { ...defaultConfig },
  }))
}
