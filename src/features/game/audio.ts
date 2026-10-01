import type { CombatEvent, Snapshot } from './model/simulation'
import { readMuted, saveMuted } from '@/shared/audio/preferences'

const sounds = {
  ocean: ['ocean_ambience_loop', 0.16], sailing: ['ship_sailing_loop', 0.18],
  cannon: ['cannon_fire_1', 0.4], broadside: ['cannon_broadside', 0.4],
  splash: ['cannonball_water_hit_1', 0.15], hit: ['ship_wood_hit_1', 0.4],
  collision: ['ship_collision', 0.4], explosion: ['ship_explosion_1', 0.4],
  sinking: ['ship_sinking', 0.35], score: ['score_point', 0.25],
  start: ['game_start', 0.35], pause: ['game_pause', 0.3], resume: ['game_resume', 0.3],
  defeat: ['game_over', 0.35], complete: ['game_complete', 0.35],
  lowHealth: ['health_low', 0.3], timeWarning: ['time_warning', 0.3], click: ['ui_click', 0.25],
} as const
type Sound = keyof typeof sounds
type Voice = { source: AudioBufferSourceNode; gain: GainNode; sound: Sound }
const decoded = new Map<Sound, AudioBuffer>()


export class BattleAudio {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private abort = new AbortController()
  private voices = new Set<Voice>()
  private loops = new Map<Sound, Voice>()
  private lastPlayed = new Map<Sound, number>()
  private muted = readMuted()
  private destroyed = false
  private ready = false
  private started = false
  private lowHealthWarned = false
  private timeWarned = false
  private latest: Snapshot | null = null
  private moving = false

  constructor(onUnavailable: () => void) {
    try {
      this.context = new AudioContext()
      this.master = this.context.createGain()
      this.master.gain.value = this.muted ? 0 : 0.7
      this.master.connect(this.context.destination)
    } catch {
      
      queueMicrotask(() => { if (!this.destroyed) onUnavailable() })
      return
    }
    window.addEventListener('pointerdown', this.unlock, true)
    window.addEventListener('keydown', this.unlock, true)
    window.addEventListener('blur', this.quiet)
    document.addEventListener('visibilitychange', this.visibility)
    this.unlock()
    const context = this.context
    void Promise.allSettled((Object.keys(sounds) as Sound[]).map(async (sound) => {
      if (decoded.has(sound)) return
      const response = await fetch(`/assets/sounds/${sounds[sound][0]}.wav`, { signal: this.abort.signal })
      if (!response.ok) throw new Error('Sound unavailable')
      const buffer = await context.decodeAudioData(await response.arrayBuffer())
      if (!this.destroyed) decoded.set(sound, buffer)
    })).then((results) => {
      if (this.destroyed) return
      this.ready = true
      if (results.some((result) => result.status === 'rejected')) onUnavailable()
      this.syncLoops()
    })
  }

  
  private unlock = () => {
    if (!this.context || this.destroyed || this.muted) return
    if (this.context.state !== 'running') {
      void this.context.resume().then(() => this.syncLoops()).catch(() => {})
    } else this.syncLoops()
  }

  private visibility = () => { if (document.hidden) this.quiet() }
  private quiet = () => { this.stopAll() }

  private release(voice: Voice, stop: boolean) {
    if (!this.voices.delete(voice)) return
    voice.source.onended = null
    if (stop) voice.source.stop()
    voice.source.disconnect(); voice.gain.disconnect()
    if (this.loops.get(voice.sound) === voice) this.loops.delete(voice.sound)
  }

  private stopAll() {
    for (const voice of this.voices) this.release(voice, true)
  }

  private play(sound: Sound, loop = false) {
    const context = this.context
    const buffer = decoded.get(sound)
    if (!context || !this.master || !buffer || !this.ready || this.destroyed || this.muted || document.hidden || !document.hasFocus() || context.state !== 'running') return false
    if (loop && this.loops.has(sound)) return true
    
    if (!loop && context.currentTime - (this.lastPlayed.get(sound) ?? -Infinity) < 0.09) return false
    if (this.voices.size >= 18) {
      const oldest = [...this.voices].find((voice) => !voice.source.loop)
      if (oldest) this.release(oldest, true)
    }
    const source = context.createBufferSource()
    const gain = context.createGain()
    source.buffer = buffer; source.loop = loop; gain.gain.value = sounds[sound][1]
    source.connect(gain); gain.connect(this.master)
    const voice = { source, gain, sound }
    this.voices.add(voice)
    if (loop) this.loops.set(sound, voice)
    source.onended = () => this.release(voice, false)
    source.start()
    this.lastPlayed.set(sound, context.currentTime)
    return true
  }

  private syncLoops() {
    if (this.destroyed || this.latest?.status !== 'playing') return
    if (!this.started && this.play('start')) this.started = true
    this.play('ocean', true)
    if (this.moving) this.play('sailing', true)
    else {
      const sailing = this.loops.get('sailing')
      if (sailing) this.release(sailing, true)
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted
    saveMuted(muted)
    if (this.master) this.master.gain.value = muted ? 0 : 0.7
    this.stopAll()
    if (!muted) { this.unlock(); this.play('click') }
  }

  update(snapshot: Snapshot, moving = false, silent = false) {
    const previous = this.latest?.status
    this.latest = snapshot; this.moving = moving
    if (snapshot.status !== previous) {
      this.stopAll()
      if (snapshot.status === 'paused' && !silent) this.play('pause')
      if (snapshot.status === 'playing' && previous === 'paused') this.play('resume')
      if (snapshot.status === 'ended') {
        this.play(snapshot.health === 0 ? 'defeat' : 'complete')
        if (snapshot.health === 0) this.play('sinking')
      }
    }
    if (snapshot.status !== 'playing') return
    if (snapshot.health / snapshot.maxHealth <= 0.25 && !this.lowHealthWarned) { this.lowHealthWarned = true; this.play('lowHealth') }
    if (snapshot.remaining <= 10 && !this.timeWarned) { this.timeWarned = true; this.play('timeWarning') }
    this.syncLoops()
  }

  combat(event: CombatEvent) {
    if (this.latest?.status !== 'playing') return
    const mapping: Record<CombatEvent, Sound> = {
      'front-fired': 'cannon', 'broadside-fired': 'broadside', 'hull-hit': 'hit',
      'chaser-impact': 'collision', 'ship-destroyed': 'explosion', 'point-scored': 'score',
      'shot-splashed': 'splash',
    }
    this.play(mapping[event])
  }

  destroy() {
    if (this.destroyed) return
    this.destroyed = true; this.abort.abort(); this.stopAll()
    window.removeEventListener('pointerdown', this.unlock, true)
    window.removeEventListener('keydown', this.unlock, true)
    window.removeEventListener('blur', this.quiet)
    document.removeEventListener('visibilitychange', this.visibility)
    this.master?.disconnect()
    if (this.context) void this.context.close().catch(() => {})
  }
}
