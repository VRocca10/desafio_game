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
  return <section className="space-y-4 text-left">
    <h2 className="text-xl font-semibold">{kind === 'ranking' ? 'Ranking' : 'Match History'}</h2>
    <p className="text-xs text-muted-foreground">{kind === 'ranking' ? `Voyages with ${settings.duration}s sessions and ${settings.spawnInterval}s spawns.` : `Your voyages · ${playerId.slice(0, 8)}`}</p>
    {query.isPending && <p role="status">Loading voyages…</p>}
    {query.isError && <div role="alert"><p>Unable to load voyages.</p><Button onClick={() => void query.refetch()}>Try again</Button></div>}
    {query.isFetching && !query.isPending && <p role="status">Refreshing voyages…</p>}
    {query.data && <>
      {query.data.items.length === 0 ? <p>No voyages yet.</p> : <ol className="space-y-3" start={(page - 1) * query.data.pageSize + 1}>
        {query.data.items.map((match, index) => <li key={match.id} className="rounded border border-primary/20 bg-slate-950/30 p-3" data-match-id={match.id}>
          <div className="flex justify-between gap-2"><strong>{kind === 'ranking' ? `${(page - 1) * query.data.pageSize + index + 1}. ${match.player.name}` : new Date(match.endedAt).toLocaleString('en-US')}</strong><span>{match.score} points</span></div>
          <p className="text-xs text-muted-foreground">{match.duration.toFixed(1)}s · {match.reason === 'sunk' ? 'Ship sunk' : 'Time completed'} · {match.player.id.slice(0, 8)}</p>
        </li>)}
      </ol>}
      <div className="flex items-center justify-between gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="text-xs">Page {page} of {Math.max(1, Math.ceil(query.data.total / query.data.pageSize))}</span><Button variant="outline" disabled={page * query.data.pageSize >= query.data.total} onClick={() => setPage((value) => value + 1)}>Next</Button></div>
    </>}
  </section>
}
