export interface GameConfig {
  width: number
  height: number
  duration: number
  spawnInterval: number
  playerHealth: number
  enemyHealth: number
  playerSpeed: number
  enemySpeed: number
  turnSpeed: number
  bulletSpeed: number
  bulletLifetime: number
  damage: number
  impactDamage: number
  frontCooldown: number
  sideCooldown: number
  enemyCooldown: number
  shooterRange: number
  spawnDistance: number
  spawnSequence: readonly ('chaser' | 'shooter')[]
  spawnPoints: readonly { x: number; y: number }[]
}

export const defaultConfig: Readonly<GameConfig> = {
  width: 960, height: 600, duration: 90, spawnInterval: 4,
  playerHealth: 100, enemyHealth: 40, playerSpeed: 170, enemySpeed: 65,
  turnSpeed: 2.6, bulletSpeed: 360, bulletLifetime: 1.8,
  damage: 20, impactDamage: 25, frontCooldown: 0.35, sideCooldown: 0.9,
  enemyCooldown: 1.8, shooterRange: 310,
  spawnDistance: 280, spawnSequence: ['chaser', 'shooter'],
  spawnPoints: [{ x: 60, y: 60 }, { x: 900, y: 60 }, { x: 900, y: 540 }, { x: 60, y: 540 }],
}
