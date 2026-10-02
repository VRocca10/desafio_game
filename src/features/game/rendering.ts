import { Application, Assets, Container, Graphics, Sprite, Texture, Rectangle, TilingSprite } from 'pixi.js'
import { islands, type Simulation, type Ship } from './model/simulation'

const base = '/assets/png/retina/'
const paths = {
  player: `${base}ships/ship_5.png`, chaser: `${base}ships/ship_2.png`,
  shooter: `${base}ships/ship_3.png`, explosion: `${base}effects/explosion_3.png`,
  tiles: '/assets/tilesheet/tiles_sheet_retina.png',
  enemyBar: `${base}ui/hud/enemy_health_frame.png`,
  water: `${base}tiles/tile_73.png`,
}
const damagePaths = [8, 9, 11, 14, 15, 17, 20, 21, 23].map(number => `${base}ships/ship_${number}.png`)


export async function createRenderer(host: HTMLElement, world: Simulation, signal: AbortSignal) {
  const app = new Application()
  let initialized = false
  try {
    await app.init({ width: 960, height: 600, background: '#164e63', antialias: false, resolution: Math.min(devicePixelRatio || 1, 2), autoDensity: true, autoStart: false })
    initialized = true
    if (signal.aborted) { app.destroy(true, { children: true, context: true }); return null }
    const textures = await Assets.load<Texture>([...Object.values(paths), ...damagePaths])
    if (signal.aborted) { app.destroy(true, { children: true, context: true }); return null }
    app.canvas.setAttribute('aria-label', 'Naval battle arena')
    app.canvas.setAttribute('role', 'img')
    host.appendChild(app.canvas)
    const scene = new Container()
    app.stage.addChild(scene)
    const tile = (x: number, y: number, width: number, height: number) => new Texture({ source: textures[paths.tiles].source, frame: new Rectangle(x, y, width, height) })
    const tileTextures = [textures[paths.water], tile(640, 0, 512, 512), tile(768, 512, 128, 128), tile(128, 384, 128, 128), tile(1536, 0, 256, 256)]
    const water = new TilingSprite({ texture: tileTextures[0], width: 960, height: 600 })
    app.stage.addChildAt(water, 0)
    const terrain = new Container()
    for (const island of islands) {
      const shore = new Graphics().circle(island.x, island.y, island.radius + 18).fill({ color: 0xb4f0df, alpha: .35 })
      const land = new Sprite(tileTextures[1]); land.anchor.set(.5); land.position.set(island.x, island.y); land.width = land.height = island.radius * 2.25
      const mask = new Graphics().circle(island.x, island.y, island.radius).fill(0xffffff)
      land.mask = mask
      terrain.addChild(shore, land, mask)
      for (const [texture, dx, dy, size] of [[2, -20, -12, 44], [2, 24, 25, 30], [3, 26, -24, 32]] as const) {
        const decoration = new Sprite(tileTextures[texture]); decoration.anchor.set(.5); decoration.position.set(island.x + dx, island.y + dy); decoration.width = decoration.height = size; terrain.addChild(decoration)
      }
      if (island === islands[0]) { const fort = new Sprite(tileTextures[4]); fort.anchor.set(.5); fort.position.set(island.x - 12, island.y + 10); fort.width = fort.height = 56; terrain.addChild(fort) }
    }
    scene.addChild(terrain)
    const actors = new Container()
    const bars = new Container()
    const shots = new Container()
    scene.addChild(actors, shots, bars)
    const sprites = new Map<number, Sprite>()
    const effects = new Map<number, Sprite>()
    const healthBars = new Map<number, { container: Container; fill: Graphics }>()
    const bullets = new Map<number, Graphics>()
    const alive = new Set<number>()
    const visible = new Set<number>()
    const activeBullets = new Set<number>()
    let invalidated = true
    let lastStatus: Simulation['status'] | undefined
    const resize = () => {
      invalidated = true
      const width = Math.max(1, host.clientWidth)
      const height = Math.max(1, host.clientHeight)
      app.renderer.resize(width, height)
      const scale = Math.min(width / world.config.width, height / world.config.height)
      water.width = width; water.height = height; water.tileScale.set(Math.max(.5, scale * 1.5))
      scene.scale.set(scale)
      scene.position.set((width - world.config.width * scale) / 2, (height - world.config.height * scale) / 2)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()
    return {
      draw(force = false) {
        if (!force && !invalidated && world.status !== 'playing' && lastStatus === world.status) return
        invalidated = false; lastStatus = world.status
        alive.clear()
        const drawShip = (ship: Ship) => {
          alive.add(ship.id)
          let sprite = sprites.get(ship.id)
          if (!sprite) {
            sprite = new Sprite(textures[paths[ship.kind]])
            sprite.anchor.set(0.5); sprite.width = 39; sprite.height = 65
            actors.addChild(sprite); sprites.set(ship.id, sprite)
            const container = new Container()
            const background = new Sprite(textures[paths.enemyBar]); background.width = 56; background.height = 12; background.position.set(-28, -48)
            const fill = new Graphics().roundRect(0, 0, 40, 4, 2).fill(0xf32716)
            fill.position.set(-20, -44)
            container.addChild(background, fill); container.visible = ship.kind !== 'player'; bars.addChild(container)
            healthBars.set(ship.id, { container, fill })
          }
          sprite.position.set(ship.x, ship.y); sprite.rotation = ship.angle + Math.PI / 2
          const health = Math.min(1, ship.health / (ship.kind === 'player' ? world.config.playerHealth : world.config.enemyHealth))
          const shipNumber = ship.kind === 'player' ? 5 : ship.kind === 'chaser' ? 2 : 3
          const damage = health <= 0 ? 18 : health < .35 ? 12 : health < .7 ? 6 : 0
          sprite.texture = textures[damage ? `${base}ships/ship_${shipNumber + damage}.png` : paths[ship.kind]]
          const bar = healthBars.get(ship.id)!
          bar.container.position.set(ship.x, ship.y)
          bar.fill.scale.x = Math.max(0, health)
        }
        drawShip(world.player)
        for (const ship of world.enemies) drawShip(ship)
        for (const [id, sprite] of sprites) if (!alive.has(id)) {
          sprite.destroy(); sprites.delete(id)
          healthBars.get(id)!.container.destroy({ children: true }); healthBars.delete(id)
        }
        activeBullets.clear()
        for (const bullet of world.bullets) {
          activeBullets.add(bullet.id)
          let shot = bullets.get(bullet.id)
          if (!shot) {
            shot = new Graphics().moveTo(-26, 0).lineTo(-3, 0).stroke({ color: 0xe4ffff, alpha: .55, width: 2 }).circle(0, 0, bullet.radius).fill(0x344b57).circle(-1, -1, 2).fill(0x819ca7)
            shots.addChild(shot); bullets.set(bullet.id, shot)
          }
          shot.position.set(bullet.x, bullet.y)
          shot.rotation = bullet.angle
        }
        for (const [id, shot] of bullets) if (!activeBullets.has(id)) { shot.destroy(); bullets.delete(id) }
        visible.clear()
        for (const effect of world.effects) visible.add(effect.id)
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
      destroy() { observer.disconnect(); app.destroy(true, { children: true, context: true }); for (const texture of tileTextures.slice(1)) texture.destroy() },
    }
  } catch (error) {
    if (initialized) app.destroy(true, { children: true, context: true })
    throw error
  }
}
