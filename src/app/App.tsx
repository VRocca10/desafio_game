import { lazy, Suspense, useState } from 'react'
import { MainMenu } from '@/features/main-menu'
import { RankingPanel } from '@/features/ranking'
import { MatchHistoryPanel, useRegistration, RegistrationStatus } from '@/features/match-history'
import { Options } from '@/features/options'
import { NetworkScenarios } from './NetworkScenarios'
import { Button } from '@/shared/components/ui/button'

const Game = lazy(() => import('@/features/game').then((module) => ({ default: module.Game })))

export default function App() {
  const [screen, setScreen] = useState<'menu' | 'game' | 'options' | 'result'>('menu')
  const registration = useRegistration()
  const status = <RegistrationStatus registration={registration} />
  if (screen === 'game') return <Suspense fallback={<p role="status">Loading game…</p>}><Game onExit={() => setScreen('menu')} onComplete={registration.complete} registrationContent={status} /></Suspense>
  if (screen === 'options') return <Options onExit={() => setScreen('menu')} />
  const last = registration.journal.last
  if (screen === 'result' && last) return <main className="grid min-h-dvh place-items-center bg-slate-950 p-6"><section className="space-y-5 rounded-xl border border-primary/30 p-6">
    <h1 className="text-3xl font-bold">Last result</h1><p>{last.reason === 'sunk' ? 'Your ship has sunk' : 'Voyage complete'}</p>
    <p>Score: {last.score} · Time played: {last.duration.toFixed(1)}s</p><p className="text-sm text-muted-foreground">{new Date(last.endedAt).toLocaleString('en-US')} · {last.config.duration}s session · {last.config.spawnInterval}s spawns</p>
    {status}<div className="flex gap-3"><Button onClick={() => setScreen('game')}>Play Again</Button><Button variant="outline" onClick={() => setScreen('menu')}>Main Menu</Button></div>
  </section></main>
  return <MainMenu onPlay={() => setScreen('game')} onOptions={() => setScreen('options')} rankingContent={<RankingPanel />} historyContent={<MatchHistoryPanel />}
    footerContent={<div className="mt-4 space-y-3 text-center">{last && <Button variant="outline" onClick={() => setScreen('result')}>Last result</Button>}{status}<NetworkScenarios onReset={registration.refresh} /></div>} />
}
