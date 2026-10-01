import { expect, test } from '@playwright/test'
import { Simulation, islands, type Action, type CombatEvent } from '../../src/features/game/model/simulation.ts'

function advance(world: Simulation, seconds: number, actions: Action[] = []) {
  for (let step = 0; step < Math.round(seconds * 60); step++) world.step(1 / 60, new Set(actions))
}

test('lethal damage immediately stops later scoring and enemy actions', () => {
  for (const cause of ['chaser', 'bullet']) {
    const world = new Simulation()
    world.step(1 / 60, new Set())
    world.player.health = 1
    const template = world.enemies[0]
    world.enemies = [{ ...template, id: 99, kind: 'shooter', x: 480, y: 370, health: 20, cooldowns: [100, 0, 0] }]
    if (cause === 'chaser') world.enemies.unshift({ ...template, x: 480, y: 480 })
    world.bullets = [
      ...(cause === 'bullet' ? [{ id: 100, x: 480, y: 480, radius: 5, angle: 0, enemy: true, life: 1 }] : []),
      { id: 101, x: 480, y: 380, radius: 5, angle: -Math.PI / 2, enemy: false, life: 1 },
    ]
    world.step(1 / 60, new Set())
    expect(world.snapshot()).toMatchObject({ health: 0, score: 0, status: 'ended' })
    expect(world.enemies.find((enemy) => enemy.id === 99)?.health).toBe(20)
  }
})

test('movement respects shorelines and arena edges; rotation changes heading', () => {
  const world = new Simulation()
  world.player.x = islands[0].x
  world.player.y = 400
  advance(world, 2, ['forward'])
  expect(world.player.y).toBeGreaterThanOrEqual(islands[0].y + islands[0].radius + world.player.radius)
  world.player.x = 480
  advance(world, 4, ['forward'])
  expect(world.player.y).toBeGreaterThanOrEqual(world.player.radius)
  const angle = world.player.angle
  advance(world, 0.5, ['right'])
  expect(world.player.angle).toBeGreaterThan(angle)
})

test('broadsides launch three parallel rounds and cooldown blocks repeated fire', () => {
  const world = new Simulation()
  world.step(1 / 60, new Set(['port', 'starboard']))
  expect(world.bullets).toHaveLength(6)
  expect(new Set(world.bullets.slice(0, 3).map((bullet) => bullet.angle)).size).toBe(1)
  world.step(1 / 60, new Set(['port', 'starboard']))
  expect(world.bullets).toHaveLength(6)
})

test('player shots kill once, remove the target and award one point', () => {
  const world = new Simulation()
  world.step(1 / 60, new Set())
  world.enemies[0] = { ...world.enemies[0], x: 480, y: 370, health: 20, kind: 'shooter', cooldowns: [100, 0, 0] }
  advance(world, 0.3, ['front'])
  expect(world.score).toBe(1)
  expect(world.enemies).toHaveLength(0)
  advance(world, 1, ['front'])
  expect(world.score).toBe(1)
})

test('both enemy types spawn; pause and match end freeze every system', () => {
  const world = new Simulation()
  advance(world, 4.1)
  expect(world.enemies.map((enemy) => enemy.kind)).toEqual(['chaser', 'shooter'])
  world.pause()
  const paused = JSON.stringify(world)
  advance(world, 2, ['forward', 'front'])
  expect(JSON.stringify(world)).toBe(paused)
  world.resume()
  world.elapsed = world.config.duration - 1 / 120
  advance(world, 1)
  expect(world.status).toBe('ended')
  const ended = JSON.stringify(world)
  advance(world, 1, ['front'])
  expect(JSON.stringify(world)).toBe(ended)
  expect(new Simulation().snapshot()).toMatchObject({ health: 100, score: 0, elapsed: 0, status: 'playing' })
})

test('chaser impact damages the player without awarding score', () => {
  const world = new Simulation()
  world.step(1 / 60, new Set())
  world.enemies[0].x = world.player.x
  world.enemies[0].y = world.player.y
  world.player.health = 20
  world.step(1 / 60, new Set())
  expect(world.snapshot()).toMatchObject({ health: 0, score: 0, status: 'ended' })
  expect(world.enemies).toHaveLength(0)
})

test('combat feedback follows cooldowns and emits a single score event per kill', () => {
  const events: CombatEvent[] = []
  const world = new Simulation(undefined, (event) => events.push(event))
  world.step(1 / 60, new Set(['port']))
  world.step(1 / 60, new Set(['port']))
  expect(events.filter((event) => event === 'broadside-fired')).toHaveLength(1)
  world.enemies[0] = { ...world.enemies[0], x: 480, y: 370, health: 20, kind: 'shooter', cooldowns: [100, 0, 0] }
  advance(world, 0.3, ['front'])
  expect(events.filter((event) => event === 'front-fired')).toHaveLength(1)
  expect(events.filter((event) => event === 'hull-hit')).toHaveLength(1)
  expect(events.filter((event) => event === 'ship-destroyed')).toHaveLength(1)
  expect(events.filter((event) => event === 'point-scored')).toHaveLength(1)
  world.pause()
  const count = events.length
  advance(world, 1, ['port', 'front'])
  expect(events).toHaveLength(count)
})
