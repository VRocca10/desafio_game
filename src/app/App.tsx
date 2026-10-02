import { lazy, Suspense, useState } from 'react'
import { MainMenu } from '@/features/main-menu'
import { RankingPanel } from '@/features/ranking'
import { MatchHistoryPanel, useRegistration, RegistrationStatus } from '@/features/match-history'
import { Options } from '@/features/options'
import { Button } from '@/shared/components/ui/button'
import { MenuScene } from '@/features/main-menu/components/MenuScene'
import { NetworkScenarios } from './NetworkScenarios'

const Game = lazy(() => import('@/features/game').then((module) => ({ default: module.Game })))

export default function App() {
  const [screen, setScreen] = useState<'menu' | 'game' | 'options' | 'result'>('menu')
  const registration = useRegistration()
  const status = <RegistrationStatus registration={registration} />
  if (screen === 'game') return <Suspense fallback={<p role="status">Loading game…</p>}><Game onExit={() => setScreen('menu')} onComplete={registration.complete} registrationContent={status} /></Suspense>
  if (screen === 'options') return <Options onExit={() => setScreen('menu')} />
  const last = registration.journal.last
  if (screen === 'result' && last) return <MenuScene><section className="menu-panel result-panel">
    <h1 className="captain-heading">Battle complete</h1>
    <p className="result-panel-score">{last.score}</p><p className="result-panel-subtitle">Points · {Math.floor(last.duration / 60).toString().padStart(2, '0')}:{Math.floor(last.duration % 60).toString().padStart(2, '0')} · {last.reason === 'sunk' ? 'Defeated' : 'Time up'}</p>
    <Button className="menu-action" onClick={() => setScreen('game')}>Play Again</Button><Button className="menu-action" onClick={() => setScreen('menu')}>Main Menu</Button><div className="text-xs text-muted-foreground">{status}</div>
  </section></MenuScene>
  return <MainMenu onPlay={() => setScreen('game')} onOptions={() => setScreen('options')} rankingContent={<RankingPanel />} historyContent={<MatchHistoryPanel />} networkContent={<NetworkScenarios embedded onReset={registration.refresh} />} onLastResult={last ? () => setScreen('result') : undefined} />
}
