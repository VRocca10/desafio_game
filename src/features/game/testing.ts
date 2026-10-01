import type { Simulation } from './model/simulation'
import type { GameInput } from './input'

export function installProbe(world: Simulation, input: GameInput, publish: () => void) {
  const scenario = new URLSearchParams(location.search).get('scenario')
  const control = { manual: !!scenario }
  if (scenario === 'combat' || scenario === 'shooter' || scenario === 'chaser') {
    world.step(1 / 60, new Set())
    world.enemies = [{ id: 100, x: 480, y: scenario === 'chaser' ? 420 : 370, radius: 23, angle: Math.PI / 2,
      health: world.config.enemyHealth, kind: scenario === 'chaser' ? 'chaser' : 'shooter', cooldowns: [scenario === 'shooter' ? 0 : 100, 0, 0] }]
  }
  if (scenario === 'time') world.elapsed = world.config.duration - 1
  if (scenario === 'stress') world.player.health = 100000
  if (scenario === 'island') { world.player.x = 320; world.player.y = 400 }
  const probe = {
    pauseClock: () => { control.manual = true },
    runClock: () => { control.manual = false },
    advance: (seconds: number) => {
      control.manual = true
      for (let step = 0; step < Math.round(Math.min(180, Math.max(0, seconds)) * 60); step++) world.step(1 / 60, input.read())
      publish()
    },
    snapshot: () => structuredClone({ ...world.snapshot(), player: world.player, enemies: world.enemies, bullets: world.bullets, config: world.config }),
  }
  const scope = window as unknown as { __battle?: typeof probe }
  scope.__battle = probe
  return { control, destroy: () => { if (scope.__battle === probe) delete scope.__battle } }
}
