export interface SessionSettings { duration: number; spawnInterval: number }
export const defaultSettings: Readonly<SessionSettings> = { duration: 90, spawnInterval: 4 }
export const settingsKey = 'pirate-battle:settings'
let sessionSettings: SessionSettings = { ...defaultSettings }
export function validSettings(value: unknown): value is SessionSettings {
  if (!value || typeof value !== 'object') return false
  const settings = value as SessionSettings
  return Number.isInteger(settings.duration) && settings.duration >= 60 && settings.duration <= 180
    && Number.isFinite(settings.spawnInterval) && settings.spawnInterval >= 1 && settings.spawnInterval <= 10
}
export function readSettings(): SessionSettings {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(settingsKey) ?? 'null')
    if (validSettings(value)) sessionSettings = { duration: value.duration, spawnInterval: value.spawnInterval }
  } catch {  }
  return { ...sessionSettings }
}
export function saveSettings(value: SessionSettings): boolean {
  if (!validSettings(value)) return false
  sessionSettings = { ...value }
  try { localStorage.setItem(settingsKey, JSON.stringify(value)); return true } catch { return false }
}
