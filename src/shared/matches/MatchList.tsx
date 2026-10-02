import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import { Button } from '@/shared/components/ui/button'
import { defaultConfig } from '@/shared/game/config'
import { readSettings } from '@/shared/game/settings'
import { readJournal } from './storage'
import { configurationKey, type MatchPage } from './contracts'

export function MatchList({ kind }: { kind: 'ranking' | 'history' }) {
  const [page, setPage] = useState(1)
  const settings = readSettings()
  const configKey = configurationKey({ ...defaultConfig, ...settings })
  const playerId = readJournal().player.id
  const query = useQuery({
    queryKey: ['matches', kind, page, kind === 'ranking' ? configKey : playerId],
    queryFn: async ({ signal }) => (await api.get<MatchPage>(`/${kind}`, { params: { page, config: configKey, playerId }, signal })).data,
    refetchOnMount: 'always', retry: 1,
  })
  const clock = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
  return <section className={`match-ledger ledger-${kind}`}>
    <h2 className="text-xl font-semibold">{kind === 'ranking' ? 'Ranking' : 'Match History'}</h2>
    <p className="ledger-subtitle">{kind === 'ranking' ? `${settings.duration} second battles · ${settings.spawnInterval} second spawn interval` : `${readJournal().player.name} · Your recent battles`}</p>
    {query.isPending && <p role="status">Loading voyages…</p>}
    {query.isError && <div role="alert"><p>Unable to load voyages.</p><Button onClick={() => void query.refetch()}>Try again</Button></div>}
    {query.isFetching && !query.isPending && <p role="status">Refreshing voyages…</p>}
    {query.data && <>
      <div className="ledger-head" aria-hidden="true">{kind === 'ranking' ? <><span>Rank</span><span>Captain</span><span>Points</span><span>Played</span></> : <><span>Date</span><span>Points</span><span>Duration</span><span>Result</span></>}</div>
      {query.data.items.length === 0 ? <p>No voyages yet.</p> : <ol start={(page - 1) * query.data.pageSize + 1}>
        {query.data.items.map((match, index) => <li key={match.id} className={`ledger-row ${match.player.id === playerId ? 'ledger-own' : ''}`} data-match-id={match.id}>
          {kind === 'ranking' && <span className="ledger-rank">{String((page - 1) * query.data.pageSize + index + 1).padStart(2, '0')}</span>}
          <strong className="ledger-captain">{kind === 'ranking' ? <>{page === 1 && index === 0 && <img className="ledger-star" src="/assets/png/retina/ui/hud/icon_score.png" alt="" />}{match.player.name}{match.player.id === playerId && <small className="ledger-you">You</small>}</> : <><time dateTime={match.endedAt}>{new Date(match.endedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}</time> <small>· {new Date(match.endedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</small></>}</strong>
          <span className="ledger-score">{match.score}<span className="sr-only"> points</span></span>
          {kind === 'ranking' ? <time className="ledger-played" dateTime={match.endedAt}>{new Date(match.endedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()} · {new Date(match.endedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</time> : <><span aria-label={`Duration ${match.duration.toFixed(1)} seconds`}>{clock(match.duration)}</span><span className={`ledger-result ${match.reason}`}>{match.reason === 'sunk' ? 'Defeated' : 'Time up'}</span></>}
        </li>)}
      </ol>}
      <div className="ledger-pagination"><Button className="round-control" aria-label="Previous" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><img src="/assets/png/retina/ui/controls/icon_turn_left.png" alt="" /></Button><span>Page {page} of {Math.max(1, Math.ceil(query.data.total / query.data.pageSize))}</span><Button className="round-control" aria-label="Next" disabled={page * query.data.pageSize >= query.data.total} onClick={() => setPage((value) => value + 1)}><img src="/assets/png/retina/ui/controls/icon_turn_right.png" alt="" /></Button></div>
    </>}
  </section>
}
