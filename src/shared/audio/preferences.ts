const muteKey = 'pirate-battle:muted'
let sessionMuted = false

export function readMuted() {
  try { sessionMuted = localStorage.getItem(muteKey) === 'true' } catch {  }
  return sessionMuted
}

export function saveMuted(muted: boolean) {
  sessionMuted = muted
  try { localStorage.setItem(muteKey, String(muted)) } catch {  }
}
