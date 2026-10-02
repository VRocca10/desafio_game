import { expect, test } from '@playwright/test'
import { Simulation, islands, type Action, type CombatEvent } from '../../src/features/game/model/simulation.ts'
import { defaultConfig } from '../../src/shared/game/config.ts'

function advance(world: Simulation, seconds: number, actions: Action[] = []) {
  for (let step = 0; step < Math.round(seconds * 60); step++) world.step(1 / 60, new Set(actions))
}

test('chasers navigate around both islands from either side without getting stuck', () => {
  for (const island of islands) for (const direction of [-1, 1]) {
    const world = new Simulation({ ...defaultConfig, duration: 180, spawnPoints: [] })
    world.player.x = island.x + direction * (island.radius + 100)
    world.player.y = island.y
    world.enemies = [{ ...world.player, id: 99, x: island.x - direction * (island.radius + 100), kind: 'chaser', angle: direction > 0 ? 0 : Math.PI, cooldowns: [0, 0, 0] }]
    for (let tick = 0; tick < 60 * 60 && world.enemies.length; tick++) {
      world.step(1 / 60, new Set())
      for (const enemy of world.enemies) for (const obstacle of islands) expect(Math.hypot(enemy.x - obstacle.x, enemy.y - obstacle.y)).toBeGreaterThanOrEqual(enemy.radius + obstacle.radius)
    }
    expect(world.enemies).toHaveLength(0)
    expect(world.player.health).toBe(75)
    expect(world.score).toBe(0)
  }
})

test('shooters behind an island find a clear firing position instead of stopping in its shadow', () => {
  for (const island of islands) {
    const world = new Simulation({ ...defaultConfig, duration: 180, playerHealth: 1000, spawnPoints: [] })
    world.player.x = island.x + island.radius + 30
    world.player.y = island.y
    world.enemies = [{ ...world.player, id: 99, x: island.x - island.radius - 30, kind: 'shooter', health: 40, angle: 0, cooldowns: [0, 0, 0] }]
    advance(world, 30)
    expect(world.player.health).toBeLessThan(1000)
  }
})

test('a complete maximum-density round keeps timed spawns safe and entities bounded', () => {
  const world = new Simulation({ ...defaultConfig, duration: 180, spawnInterval: 1, playerHealth: 1000000000, spawnSequence: ['shooter'] })
  const seen = new Set<number>()
  let maxShips = 0, maxBullets = 0
  let invalidPositions = 0, unsafeSpawns = 0
  for (let tick = 0; tick < 180 * 60; tick++) {
    world.step(1 / 60, new Set())
    for (const enemy of world.enemies) {
      if (!seen.has(enemy.id)) {
        seen.add(enemy.id)
        // The spawning tick also moves the enemy by up to one fixed step.
        if (Math.hypot(enemy.x - world.player.x, enemy.y - world.player.y) <= world.config.spawnDistance - world.config.enemySpeed / 60) unsafeSpawns++
        for (const other of world.enemies) if (other.id !== enemy.id && Math.hypot(enemy.x - other.x, enemy.y - other.y) < enemy.radius + other.radius - 2 * world.config.enemySpeed / 60) unsafeSpawns++
      }
      if (!Number.isFinite(enemy.angle) || islands.some(island => Math.hypot(enemy.x - island.x, enemy.y - island.y) < enemy.radius + island.radius)) invalidPositions++
    }
    maxShips = Math.max(maxShips, world.enemies.length)
    maxBullets = Math.max(maxBullets, world.bullets.length)
  }
  expect(world.status).toBe('ended')
  expect(world.elapsed).toBe(180)
  expect(invalidPositions).toBe(0)
  expect(unsafeSpawns).toBe(0)
  expect(maxShips).toBeGreaterThan(100)
  expect(maxShips).toBeLessThanOrEqual(180)
  expect(maxBullets).toBeLessThanOrEqual(Math.ceil(world.config.bulletLifetime / world.config.enemyCooldown + 1) * maxShips)
})

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
