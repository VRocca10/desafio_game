import { useEffect, useRef, useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { readMuted, saveMuted } from '@/shared/audio/preferences'

export function MenuAudio({ hiddenControls = false }: { hiddenControls?: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [muted, setMuted] = useState(readMuted)
  const [unavailable, setUnavailable] = useState(false)
  const [waitingForGesture, setWaitingForGesture] = useState(false)

  useEffect(() => {
    const audio = audioRef.current!
    audio.src = '/assets/sounds/ocean_ambience_loop.wav'
    return () => {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current!
    let disposed = false
    audio.volume = 0.112
    const play = () => {
      if (muted || document.hidden || !document.hasFocus()) return
      void audio.play().then(() => {
        if (!disposed) setWaitingForGesture(false)
      }).catch((error: unknown) => {
        if (!disposed && error instanceof DOMException && error.name === 'NotAllowedError') setWaitingForGesture(true)
      })
    }
    const pause = () => audio.pause()
    const visibility = () => { if (document.hidden) pause(); else play() }
    window.addEventListener('pointerdown', play, true)
    window.addEventListener('keydown', play, true)
    window.addEventListener('focus', play)
    window.addEventListener('blur', pause)
    document.addEventListener('visibilitychange', visibility)
    play()
    return () => {
      disposed = true
      pause()
      window.removeEventListener('pointerdown', play, true)
      window.removeEventListener('keydown', play, true)
      window.removeEventListener('focus', play)
      window.removeEventListener('blur', pause)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [muted])

  return (
    <div className="mt-4 text-center" hidden={hiddenControls}>
      <audio ref={audioRef} src="/assets/sounds/ocean_ambience_loop.wav" loop preload="auto" onError={() => setUnavailable(true)} />
      <Button variant="ghost" aria-label="Mute sound" aria-pressed={muted} onClick={() => {
        saveMuted(!muted); setMuted(!muted)
      }}>{muted ? 'Sound off' : 'Sound on'}</Button>
      {unavailable ? <p role="status" className="text-xs text-muted-foreground">Ocean ambience is unavailable. You can still play.</p>
        : waitingForGesture && !muted && <p className="text-xs text-muted-foreground">Interact with the menu to start ocean ambience.</p>}
    </div>
  )
}
