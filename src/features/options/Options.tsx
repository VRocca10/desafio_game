import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { readSettings, saveSettings, validSettings } from '@/shared/game/settings'
import { MenuScene } from '@/features/main-menu/components/MenuScene'
import { readMuted, saveMuted } from '@/shared/audio/preferences'

export function Options({ onExit, embedded = false }: { onExit: () => void; embedded?: boolean }) {
  const [initial] = useState(readSettings)
  const [duration, setDuration] = useState(String(initial.duration))
  const [spawn, setSpawn] = useState(String(initial.spawnInterval))
  const [message, setMessage] = useState('')
  const [muted, setMuted] = useState(readMuted)
  const settings = { duration: Number(duration), spawnInterval: Number(spawn) }
  function save() {
    if (!validSettings(settings)) { setMessage('Enter a whole session time from 60 to 180 seconds and a spawn time from 1 to 10 seconds.'); return false }
    setMessage(saveSettings(settings) ? 'Settings saved.' : 'Settings apply for this visit. Browser storage is unavailable.')
    return true
  }
  function adjust(field: 'duration' | 'spawn', delta: number) {
    const next = field === 'duration' ? Math.max(60, Math.min(180, Number(duration) + delta)) : Math.round(Math.max(1, Math.min(10, Number(spawn) + delta)) * 10) / 10
    if (field === 'duration') setDuration(String(next)); else setSpawn(String(next))
    setMessage('')
  }
  const content = <section className={embedded ? 'pause-options' : 'menu-panel options-panel'} aria-labelledby="options-title">
    <h1 id="options-title" className="captain-heading">Options</h1>
    <p className="sr-only">Settings apply to your next voyage.</p>
    <form noValidate onSubmit={(event) => { event.preventDefault(); save() }}>
      {([
        ['duration', 'Game session time', duration, 60, 180, 1, 10],
        ['spawn', 'Enemy spawn time', spawn, 1, 10, .1, 1],
      ] as const).map(([field, label, value, min, max, step, delta]) => <div className="option-field" key={field}>
        <label htmlFor={`option-${field}`}>{label}</label>
        <Button type="button" className="round-control" aria-label={`Decrease ${label.toLowerCase()}`} disabled={Number(value) <= min} onClick={() => adjust(field, -delta)}><img src="/assets/png/retina/ui/controls/icon_minus.png" alt="" /></Button>
        <div className="option-value"><input id={`option-${field}`} type="number" min={min} max={max} step={step} value={value} onChange={event => { (field === 'duration' ? setDuration : setSpawn)(event.target.value); setMessage('') }} /><span aria-hidden="true">s</span></div>
        <Button type="button" className="round-control" aria-label={`Increase ${label.toLowerCase()}`} disabled={Number(value) >= max} onClick={() => adjust(field, delta)}><img src="/assets/png/retina/ui/controls/icon_plus.png" alt="" /></Button>
      </div>)}
      <Button type="button" className="menu-secondary" aria-label="Mute sound" aria-pressed={muted} onClick={() => { saveMuted(!muted); setMuted(!muted) }}>{muted ? 'Sound off' : 'Sound on'}</Button>
      <p role="status" className="text-sm text-primary">{message}</p>
      <Button type="button" className="menu-action" onClick={() => { if (save()) onExit() }}>{embedded ? 'Back' : 'Main Menu'}</Button>
      <button type="submit" className="option-save">Save settings</button>
    </form>
  </section>
  return embedded ? content : <MenuScene>{content}</MenuScene>
}
