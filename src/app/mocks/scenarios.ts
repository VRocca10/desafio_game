export const scenarios = ['success', 'empty', 'pages', 'slow', 'variable', 'out-of-order', 'timeout', 'connection', 'http-400', 'http-500', 'ranking-error', 'history-error', 'post-commit-timeout', 'outage'] as const
export type Scenario = typeof scenarios[number]
const key = 'pirate-battle:scenario'
export function readScenario(): Scenario {
  try { const value = localStorage.getItem(key); return scenarios.includes(value as Scenario) ? value as Scenario : 'success' } catch { return 'success' }
}
export function saveScenario(scenario: Scenario) { try { localStorage.setItem(key, scenario) } catch {  } }
