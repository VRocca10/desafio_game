import { Application, Assets, Container, Graphics, Sprite, type Texture } from 'pixi.js'
import { islands, type Simulation } from './model/simulation'

const base = '/assets/png/retina/'
const paths = {
  player: `${base}ships/ship_1.png`, chaser: `${base}ships/ship_7.png`,
  shooter: `${base}ships/ship_13.png`, explosion: `${base}effects/explosion_1.png`,
}


export async function createRenderer(host: HTMLElement, world: Simulation, signal: AbortSignal) {
  const app = new Application()
  let initialized = false
  try {
    await app.init({ width: 960, height: 600, background: '#164e63', antialias: false, resolution: Math.min(devicePixelRatio || 1, 2), autoDensity: true, autoStart: false })
    initialized = true
    if (signal.aborted) { app.destroy(true, { children: true, context: true }); return null }
    const textures = await Assets.load<Texture>(Object.values(paths))
    if (signal.aborted) { app.destroy(true, { children: true, context: true }); return null }
    app.canvas.setAttribute('aria-label', 'Naval battle arena')
    app.canvas.setAttribute('role', 'img')
    host.appendChild(app.canvas)
    const scene = new Container()
    app.stage.addChild(scene)
    const ocean = new Graphics().rect(0, 0, world.config.width, world.config.height).fill(0x16738c)
    for (let y = 16; y < 600; y += 32) for (let x = 12; x < 960; x += 48) ocean.moveTo(x, y).lineTo(x + 12, y).stroke({ color: 0x8dd9df, alpha: 0.14, width: 2 })
    for (const island of islands) {
      ocean.circle(island.x, island.y, island.radius + 11).fill({ color: 0x87d1c5, alpha: 0.5 })
      ocean.circle(island.x, island.y, island.radius).fill(0xe7c586)
      ocean.circle(island.x - 4, island.y - 6, island.radius - 13).fill(0x579153)
      ocean.circle(island.x - 17, island.y - 16, island.radius * 0.45).fill(0x68a45a)
    }
    scene.addChild(ocean)
    const actors = new Container()
    const bars = new Graphics()
    const shots = new Graphics()
    scene.addChild(actors, shots, bars)
    const sprites = new Map<number, Sprite>()
    const effects = new Map<number, Sprite>()
    const resize = () => {
      const width = Math.max(1, host.clientWidth)
      const height = Math.max(1, host.clientHeight)
      app.renderer.resize(width, height)
      const scale = Math.min(width / world.config.width, height / world.config.height)
      scene.scale.set(scale)
      scene.position.set((width - world.config.width * scale) / 2, (height - world.config.height * scale) / 2)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()
    return {
      draw() {
        const ships = [world.player, ...world.enemies]
        const alive = new Set(ships.map((ship) => ship.id))
        for (const [id, sprite] of sprites) if (!alive.has(id)) { sprite.destroy(); sprites.delete(id) }
        bars.clear(); shots.clear()
        for (const ship of ships) {
          let sprite = sprites.get(ship.id)
          if (!sprite) {
            sprite = new Sprite(textures[paths[ship.kind]])
            sprite.anchor.set(0.5); sprite.width = 39; sprite.height = 65
            actors.addChild(sprite); sprites.set(ship.id, sprite)
          }
          sprite.position.set(ship.x, ship.y); sprite.rotation = ship.angle + Math.PI / 2
          const health = Math.min(1, ship.health / (ship.kind === 'player' ? world.config.playerHealth : world.config.enemyHealth))
          sprite.tint = health < 0.35 ? 0xc47a61 : health < 0.7 ? 0xd4bb92 : 0xffffff
          bars.roundRect(ship.x - 23, ship.y - 44, 46, 6, 2).fill(0x102a35)
          bars.rect(ship.x - 21, ship.y - 42, Math.max(0, health) * 42, 2).fill(ship.kind === 'player' ? 0x8cea9a : 0xffac75)
        }
        for (const bullet of world.bullets) shots.circle(bullet.x, bullet.y, bullet.radius + 2).fill(bullet.enemy ? 0xff9368 : 0xf8d983).circle(bullet.x, bullet.y, bullet.radius - 1).fill(0x26333c)
        const visible = new Set(world.effects.map((effect) => effect.id))
        for (const [id, sprite] of effects) if (!visible.has(id)) { sprite.destroy(); effects.delete(id) }
        for (const effect of world.effects) {
          let sprite = effects.get(effect.id)
          if (!sprite) { sprite = new Sprite(textures[paths.explosion]); sprite.anchor.set(0.5); actors.addChild(sprite); effects.set(effect.id, sprite) }
          sprite.position.set(effect.x, effect.y)
          sprite.width = sprite.height = effect.size * (1.3 - effect.life)
          sprite.alpha = effect.life / 0.35
        }
        app.render()
      },
      destroy() { observer.disconnect(); app.destroy(true, { children: true, context: true }) },
    }
  } catch (error) {
    if (initialized) app.destroy(true, { children: true, context: true })
    throw error
  }
}
