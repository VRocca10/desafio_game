import type { GameConfig } from '../game/config'
import { validSettings } from '../game/settings'

export interface Player { id: string; name: string }
export interface MatchResult {
  id: string
  player: Player
  endedAt: string
  score: number
  duration: number
  reason: 'time' | 'sunk'
  config: GameConfig
}
export interface MatchPage { items: MatchResult[]; total: number; page: number; pageSize: number }
export function validResult(value: unknown): value is MatchResult {
  if (!value || typeof value !== 'object') return false
  const item = value as MatchResult
  return typeof item.id === 'string' && item.id.length > 0 && typeof item.player?.id === 'string'
    && typeof item.player.name === 'string' && Number.isFinite(Date.parse(item.endedAt))
    && Number.isInteger(item.score) && item.score >= 0 && Number.isFinite(item.duration)
    && item.duration >= 0 && validSettings(item.config) && item.duration <= item.config.duration
    && (item.reason === 'time' || item.reason === 'sunk')
}
export function configurationKey(config: GameConfig): string {
  const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical)
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, canonical(entry)])) : value
  return JSON.stringify(canonical(config))
}
