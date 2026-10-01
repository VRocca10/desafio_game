import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { readSettings, saveSettings, validSettings } from '@/shared/game/settings'

export function Options({ onExit }: { onExit: () => void }) {
  const [initial] = useState(readSettings)
  const [duration, setDuration] = useState(String(initial.duration))
  const [spawn, setSpawn] = useState(String(initial.spawnInterval))
  const [message, setMessage] = useState('')
  const settings = { duration: Number(duration), spawnInterval: Number(spawn) }
  return <main className="grid min-h-dvh place-items-center bg-slate-950 p-5">
    <section className="w-full max-w-lg space-y-6 rounded-xl border border-primary/30 bg-slate-900 p-6" aria-labelledby="options-title">
      <h1 id="options-title" className="text-3xl font-bold">Options</h1>
      <p className="text-muted-foreground">Settings apply to your next voyage.</p>
      <form noValidate className="space-y-5" onSubmit={(event) => {
        event.preventDefault()
        if (!validSettings(settings)) { setMessage('Enter a whole session time from 60 to 180 seconds and a spawn time from 1 to 10 seconds.'); return }
        setMessage(saveSettings(settings) ? 'Settings saved.' : 'Settings apply for this visit. Browser storage is unavailable.')
      }}>
        <label className="grid gap-2">Game session time
          <input autoFocus className="rounded border border-primary/40 bg-slate-950 p-3 focus-visible:outline-2 focus-visible:outline-primary" type="number" min="60" max="180" step="1" value={duration} onChange={(event) => { setDuration(event.target.value); setMessage('') }} aria-describedby="duration-help" />
          <span id="duration-help" className="text-xs text-muted-foreground">60–180 seconds, whole numbers.</span>
        </label>
        <label className="grid gap-2">Enemy spawn time
          <input className="rounded border border-primary/40 bg-slate-950 p-3 focus-visible:outline-2 focus-visible:outline-primary" type="number" min="1" max="10" step="0.1" value={spawn} onChange={(event) => { setSpawn(event.target.value); setMessage('') }} aria-describedby="spawn-help" />
          <span id="spawn-help" className="text-xs text-muted-foreground">1–10 seconds between spawns. Lower values increase difficulty.</span>
        </label>
        <p role="status" className="text-sm text-primary">{message}</p>
        <div className="flex gap-3"><Button type="submit">Save settings</Button><Button type="button" variant="outline" onClick={onExit}>Main Menu</Button></div>
      </form>
    </section>
  </main>
}
