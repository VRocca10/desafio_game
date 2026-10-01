import type { Action, Input } from './model/simulation'

const keys: Record<string, Action> = { KeyW: 'forward', ArrowUp: 'forward', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', Space: 'front', KeyQ: 'port', KeyE: 'starboard' }

export function createInput(active: () => boolean, pause: (automatic?: boolean) => void) {
  const held = new Map<string, Action>()
  const read = (): Input => new Set(held.values())
  const clear = () => held.clear()
  const down = (event: KeyboardEvent) => {
    if (!active()) return
    if (event.code === 'Escape') { event.preventDefault(); pause(); return }
    const action = keys[event.code]
    if (action) { event.preventDefault(); held.set(event.code, action) }
  }
  const up = (event: KeyboardEvent) => { held.delete(event.code) }
  const blur = () => { clear(); pause(true) }
  const visibility = () => { if (document.hidden) blur() }
  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)
  window.addEventListener('blur', blur)
  document.addEventListener('visibilitychange', visibility)
  return {
    read, clear,
    press: (id: number, action: Action) => { if (active()) held.set(`pointer-${id}`, action) },
    release: (id: number) => { held.delete(`pointer-${id}`) },
    destroy() {
      clear()
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      document.removeEventListener('visibilitychange', visibility)
    },
  }
}
export type GameInput = ReturnType<typeof createInput>
