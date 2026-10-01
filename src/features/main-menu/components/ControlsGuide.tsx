const controls = [
  ['W / ↑', 'Move forward'],
  ['A D / ← →', 'Turn left / right'],
  ['Space', 'Fire forward'],
  ['Q / E', 'Fire left / right'],
  ['Esc', 'Pause'],
] as const

export function ControlsGuide() {
  return (
    <details className="mt-6 rounded-lg border border-primary/25 bg-slate-950/20 text-left">
      <summary className="cursor-pointer rounded-lg px-4 py-3 text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
        Captain’s guide
      </summary>
      <div className="px-4 pb-4">
        <p className="mb-3 text-xs text-muted-foreground">Controls for your voyage.</p>
        <dl className="space-y-2 text-xs sm:text-sm">
          {controls.map(([keys, action]) => (
            <div key={action} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <dt>{action}</dt>
              <dd><kbd className="rounded border border-white/15 bg-white/5 px-2 py-1 font-mono text-xs text-primary">{keys}</kbd></dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          On mobile, hold the on-screen controls to steer and fire at the same time.
        </p>
      </div>
    </details>
  )
}
