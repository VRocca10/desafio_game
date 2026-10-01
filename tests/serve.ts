import { spawn } from 'node:child_process'
import { setTimeout } from 'node:timers/promises'

export default async function serve() {
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--outDir', 'dist-test', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: 'pipe', windowsHide: true })
  let output = ''
  server.stderr.on('data', (data) => { output += String(data) })
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Preview failed: ${output}`)
    try {
      const response = await fetch('http://127.0.0.1:4173')
      if (response.ok) return async () => {
        const stopped = new Promise<void>((resolve) => server.once('exit', () => resolve()))
        server.kill(); await stopped
      }
    } catch {}
    await setTimeout(100)
  }
  server.kill()
  throw new Error(`Preview did not start: ${output}`)
}
