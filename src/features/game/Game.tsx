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
import { Options } from '@/features/options'
import './game.css'

const controls: [Action, string][] = [['left', 'Turn left'], ['forward', 'Forward'], ['right', 'Turn right'], ['port', 'Fire left'], ['front', 'Fire forward'], ['starboard', 'Fire right']]
const controlIcons: Record<Action, string> = { left: 'turn_left', forward: 'forward', right: 'turn_right', port: 'fire_left', front: 'fire_front', starboard: 'fire_right' }

export function Game({ onExit, onComplete, registrationContent }: { onExit: () => void; onComplete: (result: MatchResult) => void; registrationContent: ReactNode }) {
  const host = useRef<HTMLDivElement>(null)
  const worldRef = useRef<Simulation | null>(null)
  const inputRef = useRef<GameInput | null>(null)
  const audioRef = useRef<BattleAudio | null>(null)
  const [muted, setMuted] = useState(readMuted)
  const [audioUnavailable, setAudioUnavailable] = useState(false)
  const [round, setRound] = useState(0)
  const [pauseOptions, setPauseOptions] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [hud, setHud] = useState<Snapshot>(() => new Simulation().snapshot())
  const resumeButton = useRef<HTMLButtonElement>(null)
  const pauseButton = useRef<HTMLButtonElement>(null)
  const previousStatus = useRef(hud.status)

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
        audio.update(world.snapshot()); publishResult(); setHud(world.snapshot()); view.draw(true)
      })
      let previous = performance.now()
      let accumulator = 0
      let publish = 0
      let moving = false
      const tick = (now: number) => {
        const started = probe ? performance.now() : 0
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
        const simulated = probe ? performance.now() : 0
        audio.update(world.snapshot(), moving && input!.read().has('forward'))
        publishResult()
        const rendering = probe ? performance.now() : 0
        view.draw()
        if (probe) { const ended = performance.now(); probe.record(simulated - started, ended - rendering, ended - started) }
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
    else if (previousStatus.current === 'paused') pauseButton.current?.focus()
    previousStatus.current = hud.status
  }, [hud.status])

  function restart() {
    setLoading(true); setError(false); setAudioUnavailable(false); setHud(new Simulation().snapshot())
    setRound((value) => value + 1)
  }

  function togglePause() {
    setPauseOptions(false)
    const savedMuted = readMuted()
    audioRef.current?.setMuted(savedMuted)
    setMuted(savedMuted)
    const world = worldRef.current
    if (!world) return
    inputRef.current?.clear()
    if (world.status === 'paused') world.resume(); else world.pause()
    audioRef.current?.update(world.snapshot())
    setHud(world.snapshot())
  }

  return (
    <main className="game-shell">
      <header className="game-hud" aria-label="Battle status">
        <h1 className="sr-only">Open waters</h1>
        <dl className="battle-counters"><div className="hud-health"><dt><img src="/assets/png/retina/ui/hud/icon_heart.png" alt="Hull" /></dt><dd><span className="health-track"><span className="health-color" style={{ width: `${Math.min(100, hud.health / hud.maxHealth * 100)}%` }} /></span><img className="health-frame" src="/assets/png/retina/ui/hud/health_frame.png" alt="" /><span className="health-number">{Math.min(hud.maxHealth, hud.health)} / {hud.maxHealth}</span></dd></div><div className="hud-counter"><dt><img src="/assets/png/retina/ui/hud/icon_score.png" alt="Score" /></dt><dd>{hud.score}</dd></div><div className="hud-counter"><dt><img src="/assets/png/retina/ui/hud/icon_time.png" alt="Time" /></dt><dd>{Math.floor(hud.remaining / 60).toString().padStart(2, '0')}:{(hud.remaining % 60).toString().padStart(2, '0')}</dd></div></dl>
        <Button className="round-control" aria-label="Pause" ref={pauseButton} disabled={loading || error || hud.status !== 'playing'} onClick={togglePause}><img src="/assets/png/retina/ui/controls/icon_pause.png" alt="" /></Button>
        <Button className="battle-sound" variant="outline" aria-label="Mute sound" aria-pressed={muted} onClick={() => {
          audioRef.current?.setMuted(!muted); setMuted(!muted)
        }}><span aria-hidden="true">{muted ? '♫̸' : '♫'}</span><span className="sr-only">{muted ? 'Sound off' : 'Sound on'}</span></Button>
        <Button variant="outline" aria-label="Main Menu" className={`battle-home round-control ${hud.status !== 'playing' ? 'invisible' : ''}`} aria-hidden={hud.status !== 'playing'} disabled={hud.status !== 'playing'} onClick={onExit}><img src="/assets/png/retina/ui/controls/icon_home.png" alt="" /></Button>
      </header>
      <div className="game-viewport">
        <div className="game-canvas" ref={host} />
        {(loading || error) && <section className="game-overlay"><div role={error ? 'alert' : 'status'}><h2>{error ? 'Unable to load the arena' : 'Preparing your voyage…'}</h2>{error && <Button onClick={restart}>Try again</Button>}</div></section>}
        {!loading && !error && hud.status !== 'playing' && <GameDialog label={hud.status === 'paused' ? 'Battle paused' : 'Battle result'} onEscape={hud.status === 'paused' ? togglePause : undefined}>
          {hud.status === 'paused' && pauseOptions ? <Options embedded onExit={() => setPauseOptions(false)} /> : <div className="battle-dialog-content"><h2 className="captain-heading">{hud.status === 'paused' ? 'Paused' : 'Battle complete'}</h2>
            {hud.status === 'paused' ? <p className="battle-dialog-subtitle">Ready when you are.</p> : <><p className="battle-result-score">{hud.score}</p><p className="battle-dialog-subtitle">Points · {Math.floor(hud.elapsed / 60).toString().padStart(2, '0')}:{Math.floor(hud.elapsed % 60).toString().padStart(2, '0')} · {hud.health === 0 ? 'Defeated' : 'Time up'}</p></>}
            <Button className="menu-action" ref={resumeButton} onClick={hud.status === 'paused' ? togglePause : restart}>{hud.status === 'paused' ? 'Resume' : 'Play Again'}</Button>
            {hud.status === 'paused' && <Button className="menu-action" onClick={() => setPauseOptions(true)}>Options</Button>}
            <Button className="menu-action" onClick={onExit}>Main Menu</Button>
            {hud.status === 'ended' && <div className="battle-registration">{registrationContent}</div>}
          </div>}
        </GameDialog>}
      </div>
      <footer className="game-controls">
        {audioUnavailable && <p role="status" className="text-xs text-muted-foreground">Some sounds are unavailable. You can keep playing.</p>}
        <p className="battle-key-guide">W / ↑ move · A D / ← → turn · Space fire · Q / E broadsides · Esc pause</p>
        <div className="battle-touch-controls" aria-label="Touch controls">
          {controls.map(([action, label]) => <Button key={action} aria-label={label} data-action={action} variant="outline" className="round-control touch-none select-none" disabled={loading || error || hud.status !== 'playing'}
            onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); inputRef.current?.press(event.pointerId, action) }}
            onPointerUp={(event) => inputRef.current?.release(event.pointerId)} onPointerCancel={(event) => inputRef.current?.release(event.pointerId)} onLostPointerCapture={(event) => inputRef.current?.release(event.pointerId)}
            onContextMenu={(event) => event.preventDefault()}><img src={`/assets/png/retina/ui/controls/icon_${controlIcons[action]}.png`} alt="" /></Button>)}
        </div>
      </footer>
      <img className="battle-brand" src="/assets/logo_jungle_gaming.svg" alt="Jungle Gaming" />
    </main>
  )
}
