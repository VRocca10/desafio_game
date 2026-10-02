import type { ReactNode } from 'react'

export function MenuScene({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate min-h-svh overflow-x-clip bg-background">
      <div className="menu-scenery pointer-events-none fixed inset-0 -z-10" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-slate-950/35" aria-hidden="true" />
      <main id="main-content" className="captain-scene-content">
        {children}
      </main>
      <footer className="captain-brand">
        <img src="/assets/logo_jungle_gaming.svg" alt="Jungle Gaming" />
      </footer>
    </div>
  )
}
