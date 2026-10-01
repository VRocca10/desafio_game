import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Simulation, type Action, type Snapshot } from './model/simulation'
import { createInput, type GameInput } from './input'
import { createRenderer } from './rendering'
import { BattleAudio } from './audio'
import { readMuted } from '@/shared/audio/preferences'
import { readSettings } from '@/shared/game/settings'
import { defaultConfig } from './model/config'
import { readJournal } from '@/shared/matches/storage'
import type { MatchResult } from '@/shared/matches/contracts'
import { installProbe } from './testing'
import { GameDialog } from './GameDialog'
import './game.css'

const controls: [Action, string][] = [['left', 'Turn left'], ['forward', 'Forward'], ['right', 'Turn right'], ['port', 'Fire left'], ['front', 'Fire forward'], ['starboard', 'Fire right']]

export function Game({ onExit, onComplete, registrationContent }: { onExit: () => void; onComplete: (result: MatchResult) => void; registrationContent: ReactNode }) {
  const host = useRef<HTMLDivElement>(null)
  const worldRef = useRef<Simulation | null>(null)
  const inputRef = useRef<GameInput | null>(null)
  const audioRef = useRef<BattleAudio | null>(null)
  const [muted, setMuted] = useState(readMuted)
  const [audioUnavailable, setAudioUnavailable] = useState(false)
  const [round, setRound] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [hud, setHud] = useState<Snapshot>(() => new Simulation().snapshot())
  const resumeButton = useRef<HTMLButtonElement>(null)
  const pauseButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const abort = new AbortController()
    const audio = new BattleAudio(() => setAudioUnavailable(true))
    audioRef.current = audio
    const world = new Simulation({ ...defaultConfig, ...readSettings() }, (event) => audio.combat(event))
    const matchId = crypto.randomUUID()
    const player = readJournal().player
    let completed = false
    const publishResult = () => {
      if (world.status === 'ended' && !completed) {
        completed = true
        onComplete({ id: matchId, player, endedAt: new Date().toISOString(), score: world.score, duration: world.elapsed, reason: world.player.health === 0 ? 'sunk' : 'time', config: world.config })
      }
    }
    worldRef.current = world
    let frame = 0
    let renderer: Awaited<ReturnType<typeof createRenderer>> = null
    let input: GameInput | null = null
    let probe: ReturnType<typeof installProbe> | undefined
    void createRenderer(host.current!, world, abort.signal).then((view) => {
      if (!view) return
      renderer = view
      input = createInput(() => world.status === 'playing', (automatic) => {
        world.pause(); input?.clear(); setHud(world.snapshot())
        audio.update(world.snapshot(), false, automatic)
      })
      inputRef.current = input
      if (document.hidden || !document.hasFocus()) world.pause()
      setLoading(false); setHud(world.snapshot())
      audio.update(world.snapshot())
      if (import.meta.env.MODE === 'test') probe = installProbe(world, input, () => {
        audio.update(world.snapshot()); publishResult(); setHud(world.snapshot()); view.draw()
      })
      let previous = performance.now()
      let accumulator = 0
      let publish = 0
      let moving = false
      const tick = (now: number) => {
        const delta = Math.max(0, (now - previous) / 1000)
        previous = now
        if (world.status === 'playing' && !probe?.control.manual) {
          accumulator += delta

          let steps = 0
          while (accumulator >= 1 / 60 && steps++ < 120 && world.status === 'playing') {
            const { x, y } = world.player
            world.step(1 / 60, input!.read())
            moving = x !== world.player.x || y !== world.player.y
            accumulator -= 1 / 60
          }
        } else { accumulator = 0; if (world.status !== 'playing') input!.clear() }
        audio.update(world.snapshot(), moving && input!.read().has('forward'))
        publishResult()
        view.draw()
        if (now - publish > 100) { setHud(world.snapshot()); publish = now }
        frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }).catch(() => { if (!abort.signal.aborted) { audio.destroy(); setError(true); setLoading(false) } })
    return () => {
      abort.abort(); cancelAnimationFrame(frame); probe?.destroy(); input?.destroy(); renderer?.destroy(); audio.destroy()
      inputRef.current = null; worldRef.current = null; audioRef.current = null
    }
  }, [round, onComplete])

  useEffect(() => {
    if (hud.status === 'paused' || hud.status === 'ended') resumeButton.current?.focus()
  }, [hud.status])

  function restart() {
    setLoading(true); setError(false); setAudioUnavailable(false); setHud(new Simulation().snapshot())
    setRound((value) => value + 1)
  }

  function togglePause() {
    const world = worldRef.current
    if (!world) return
    inputRef.current?.clear()
    if (world.status === 'paused') { world.resume(); pauseButton.current?.focus() } else world.pause()
    audioRef.current?.update(world.snapshot())
    setHud(world.snapshot())
  }

  return (
    <main className="game-shell">
      <header className="game-hud" aria-label="Battle status">
        <div><p className="text-xs uppercase tracking-widest text-primary">Pirate Battle</p><h1 className="text-xl font-bold">Open waters</h1></div>
        <dl className="flex gap-4 text-sm"><div><dt>Hull</dt><dd>{Math.min(100, Math.round(hud.health / hud.maxHealth * 100))}%</dd></div><div><dt>Score</dt><dd>{hud.score}</dd></div><div><dt>Time</dt><dd>{hud.remaining}s</dd></div></dl>
        <Button ref={pauseButton} disabled={loading || error || hud.status !== 'playing'} onClick={togglePause}>Pause</Button>
        <Button variant="outline" aria-label="Mute sound" aria-pressed={muted} onClick={() => {
          audioRef.current?.setMuted(!muted); setMuted(!muted)
        }}>{muted ? 'Sound off' : 'Sound on'}</Button>
        <Button variant="outline" className={hud.status !== 'playing' ? 'invisible' : ''} aria-hidden={hud.status !== 'playing'} disabled={hud.status !== 'playing'} onClick={onExit}>Main Menu</Button>
      </header>
      <div className="game-viewport">
        <div className="game-canvas" ref={host} />
        {(loading || error) && <section className="game-overlay"><div role={error ? 'alert' : 'status'}><h2>{error ? 'Unable to load the arena' : 'Preparing your voyage…'}</h2>{error && <Button onClick={restart}>Try again</Button>}</div></section>}
        {!loading && !error && hud.status !== 'playing' && <GameDialog label={hud.status === 'paused' ? 'Battle paused' : 'Battle result'} onEscape={hud.status === 'paused' ? togglePause : undefined}>
          <div className="space-y-4"><h2 className="text-3xl font-bold">{hud.status === 'paused' ? 'Battle paused' : hud.health === 0 ? 'Your ship has sunk' : 'Voyage complete'}</h2>
            <p>{hud.status === 'paused' ? 'Resume when you are ready, Captain.' : `Score: ${hud.score} · Time played: ${hud.elapsed}s`}</p>
            {hud.status === 'ended' && registrationContent}
            <Button ref={resumeButton} onClick={hud.status === 'paused' ? togglePause : restart}>{hud.status === 'paused' ? 'Resume' : 'Play Again'}</Button>
            <Button className="ml-3" variant="outline" onClick={onExit}>Main Menu</Button>
          </div>
        </GameDialog>}
      </div>
      <footer className="game-controls">
        {audioUnavailable && <p role="status" className="text-xs text-muted-foreground">Some sounds are unavailable. You can keep playing.</p>}
        <p className="text-xs text-muted-foreground">W / ↑ move · A D / ← → turn · Space fire · Q / E broadsides · Esc pause</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Touch controls">
          {controls.map(([action, label]) => <Button key={action} variant="outline" className="touch-none select-none" disabled={loading || error || hud.status !== 'playing'}
            onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); inputRef.current?.press(event.pointerId, action) }}
            onPointerUp={(event) => inputRef.current?.release(event.pointerId)} onPointerCancel={(event) => inputRef.current?.release(event.pointerId)} onLostPointerCapture={(event) => inputRef.current?.release(event.pointerId)}
            onContextMenu={(event) => event.preventDefault()}>{label}</Button>)}
        </div>
      </footer>
    </main>
  )
}
