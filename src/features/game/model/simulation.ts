import { defaultConfig, type GameConfig } from './config.ts'

export type Action = 'forward' | 'left' | 'right' | 'front' | 'port' | 'starboard'
export type Input = Set<Action>
export type CombatEvent = 'front-fired' | 'broadside-fired' | 'hull-hit' | 'chaser-impact' | 'ship-destroyed' | 'point-scored' | 'shot-splashed'
export interface Circle { x: number; y: number; radius: number }
export interface Ship extends Circle {
  id: number; angle: number; health: number; kind: 'player' | 'chaser' | 'shooter'
  cooldowns: number[]
}
export interface Bullet extends Circle { id: number; angle: number; enemy: boolean; life: number }
export interface Effect { id: number; x: number; y: number; life: number; size: number }
export interface Snapshot { elapsed: number; health: number; maxHealth: number; score: number; remaining: number; status: 'playing' | 'paused' | 'ended' }
export const islands: readonly Circle[] = [
  { x: 320, y: 220, radius: 66 }, { x: 665, y: 390, radius: 78 },
]
const distance = (a: Circle, b: Circle) => Math.hypot(a.x - b.x, a.y - b.y)
const overlaps = (a: Circle, b: Circle) => distance(a, b) < a.radius + b.radius
const blockingIsland = (from: Circle, to: Circle) => {
  const dx = to.x - from.x, dy = to.y - from.y
  const lengthSquared = dx * dx + dy * dy
  return islands.find(island => {
    const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((island.x - from.x) * dx + (island.y - from.y) * dy) / lengthSquared))
    return Math.hypot(from.x + t * dx - island.x, from.y + t * dy - island.y) < island.radius + from.radius
  })
}


export class Simulation {
  readonly config: GameConfig
  player: Ship = { id: 0, x: 480, y: 480, radius: 23, angle: -Math.PI / 2, health: 100, kind: 'player', cooldowns: [0, 0, 0] }
  enemies: Ship[] = []
  bullets: Bullet[] = []
  effects: Effect[] = []
  elapsed = 0
  score = 0
  status: Snapshot['status'] = 'playing'
  private nextId = 1
  private spawnTime = 0
  private spawnCount = 0
  private onEvent: (event: CombatEvent) => void
  constructor(config: GameConfig = defaultConfig, onEvent: (event: CombatEvent) => void = () => {}) {
    this.config = Object.freeze({ ...config, spawnSequence: Object.freeze([...config.spawnSequence]), spawnPoints: Object.freeze(config.spawnPoints.map((point) => Object.freeze({ ...point }))) })
    this.player.health = config.playerHealth
    this.onEvent = onEvent
  }
  snapshot(): Snapshot {
    return { elapsed: Math.floor(this.elapsed), health: this.player.health, maxHealth: this.config.playerHealth, score: this.score, remaining: Math.ceil(Math.max(0, this.config.duration - this.elapsed)), status: this.status }
  }
  pause() { if (this.status === 'playing') this.status = 'paused' }
  resume() { if (this.status === 'paused') this.status = 'playing' }
  private free(body: Circle) {
    return body.x >= body.radius && body.y >= body.radius && body.x <= this.config.width - body.radius && body.y <= this.config.height - body.radius && !islands.some((island) => overlaps(body, island))
  }
  private move(ship: Ship, speed: number, dt: number) {
    const x = ship.x + Math.cos(ship.angle) * speed * dt
    const y = ship.y + Math.sin(ship.angle) * speed * dt
    if (this.free({ ...ship, x, y })) { ship.x = x; ship.y = y }
  }
  private effect(x: number, y: number, size: number) {
    this.effects.push({ id: this.nextId++, x, y, life: 0.35, size })
  }
  private fire(ship: Ship, slot: number, side: number) {
    if (ship.cooldowns[slot] > 0) return
    ship.cooldowns[slot] = ship.kind !== 'player' ? this.config.enemyCooldown : slot === 0 ? this.config.frontCooldown : this.config.sideCooldown
    this.onEvent(side === 0 ? 'front-fired' : 'broadside-fired')
    const angle = ship.angle + side * Math.PI / 2
    for (const offset of side === 0 ? [0] : [-14, 0, 14]) {
      const x = ship.x + Math.cos(angle) * 27 + Math.cos(ship.angle) * offset
      const y = ship.y + Math.sin(angle) * 27 + Math.sin(ship.angle) * offset
      this.bullets.push({ id: this.nextId++, x, y, radius: 5, angle, enemy: ship.kind !== 'player', life: this.config.bulletLifetime })
      this.effect(x, y, 18)
    }
  }
  private spawn() {
    const points = this.config.spawnPoints
    for (let i = 0; i < points.length; i++) {
      const point = points[(this.spawnCount + i) % points.length]
      const enemy: Ship = { ...point, id: this.nextId++, radius: 23, angle: 0, health: this.config.enemyHealth, kind: this.config.spawnSequence[this.spawnCount % this.config.spawnSequence.length], cooldowns: [1, 0, 0] }
      if (this.free(enemy) && distance(enemy, this.player) > this.config.spawnDistance && !this.enemies.some((other) => overlaps(enemy, other))) {
        this.enemies.push(enemy); this.spawnCount++; return
      }
    }
  }
  step(dt: number, input: Input) {
    if (this.status !== 'playing') return
    const nextTime = this.elapsed + dt
    this.elapsed = nextTime >= this.config.duration - 1e-9 ? this.config.duration : nextTime
    if (this.elapsed >= this.config.duration) { this.status = 'ended'; return }
    this.effects = this.effects.filter((effect) => { effect.life -= dt; return effect.life > 0 })
    for (const ship of [this.player, ...this.enemies]) ship.cooldowns = ship.cooldowns.map((time) => Math.max(0, time - dt))
    this.player.angle += (Number(input.has('right')) - Number(input.has('left'))) * this.config.turnSpeed * dt
    if (input.has('forward')) this.move(this.player, this.config.playerSpeed, dt)
    if (input.has('front')) this.fire(this.player, 0, 0)
    if (input.has('port')) this.fire(this.player, 1, -1)
    if (input.has('starboard')) this.fire(this.player, 2, 1)
    this.spawnTime -= dt
    if (this.spawnTime <= 0) { this.spawn(); this.spawnTime += this.config.spawnInterval }
    for (const enemy of this.enemies) {
      let target = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x)
      
      const ahead = { ...enemy, x: enemy.x + Math.cos(target) * 65, y: enemy.y + Math.sin(target) * 65 }
      const obstacle = blockingIsland(enemy, ahead)
      if (obstacle) target = Math.atan2(enemy.y - obstacle.y, enemy.x - obstacle.x) + Math.PI / 2
      const delta = Math.atan2(Math.sin(target - enemy.angle), Math.cos(target - enemy.angle))
      enemy.angle += Math.max(-this.config.turnSpeed * dt, Math.min(this.config.turnSpeed * dt, delta))
      const blocked = enemy.kind === 'shooter' && !!blockingIsland(enemy, this.player)
      if (enemy.kind === 'chaser' || blocked || distance(enemy, this.player) > this.config.shooterRange * 0.7) this.move(enemy, this.config.enemySpeed, dt)
      if (enemy.kind === 'shooter' && !blocked && distance(enemy, this.player) < this.config.shooterRange && Math.abs(delta) < 0.15) this.fire(enemy, 0, 0)
      if (enemy.kind === 'chaser' && overlaps(enemy, this.player)) {
        enemy.health = 0; this.player.health -= this.config.impactDamage; this.effect(enemy.x, enemy.y, 75)
        this.onEvent('chaser-impact'); this.onEvent('ship-destroyed')
        if (this.player.health <= 0) {
          this.player.health = 0; this.status = 'ended'
          this.enemies = this.enemies.filter((ship) => ship.health > 0)
          return
        }
      }
    }
    this.enemies = this.enemies.filter((enemy) => enemy.health > 0)
    this.bullets = this.bullets.filter((bullet) => {
      if (this.status === 'ended') return true
      bullet.life -= dt
      bullet.x += Math.cos(bullet.angle) * this.config.bulletSpeed * dt
      bullet.y += Math.sin(bullet.angle) * this.config.bulletSpeed * dt
      if (bullet.life <= 0 || !this.free(bullet)) { this.onEvent('shot-splashed'); return false }
      const target = (bullet.enemy ? [this.player] : this.enemies).find((ship) => ship.health > 0 && overlaps(bullet, ship))
      if (!target) return true
      target.health -= this.config.damage
      if (target.kind === 'player' && target.health <= 0) { target.health = 0; this.status = 'ended' }
      this.onEvent('hull-hit')
      this.effect(target.x, target.y, target.health <= 0 ? 75 : 30)
      if (target.health <= 0 && target.kind !== 'player') {
        this.score++; this.onEvent('ship-destroyed'); this.onEvent('point-scored')
      }
      return false
    })
    this.enemies = this.enemies.filter((enemy) => enemy.health > 0)
    this.player.health = Math.max(0, this.player.health)
    if (this.player.health === 0) this.status = 'ended'
  }
}
