import { validResult, type MatchResult, type Player } from './contracts'

interface Journal { player: Player; last: MatchResult | null; pending: MatchResult[] }
const key = 'pirate-battle:journal'
let memory: Journal | undefined
export function readJournal(): Journal {
  if (memory) return memory
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? 'null') as Journal | null
    if (stored && typeof stored.player?.id === 'string' && typeof stored.player.name === 'string' && Array.isArray(stored.pending)) {
      memory = { player: stored.player, last: validResult(stored.last) ? stored.last : null, pending: stored.pending.filter(validResult) }
    }
  } catch {  }
  if (!memory) {
    memory = { player: { id: crypto.randomUUID(), name: 'Captain' }, last: null, pending: [] }
    writeJournal(memory)
  }
  return memory
}
function writeJournal(journal: Journal) {
  memory = journal
  try { localStorage.setItem(key, JSON.stringify(journal)); return true } catch { return false }
}
export function rememberResult(result: MatchResult) {
  const journal = readJournal()
  return writeJournal({ ...journal, last: result, pending: [...journal.pending.filter((match) => match.id !== result.id), result] })
}
export function confirmResult(id: string) {
  const journal = readJournal()
  return writeJournal({ ...journal, pending: journal.pending.filter((match) => match.id !== id) })
}
export function clearJournalResults() {
  const journal = readJournal()
  writeJournal({ ...journal, last: null, pending: [] })
}
