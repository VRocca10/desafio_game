import type { ReactNode } from 'react'

export function MenuScene({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate min-h-svh overflow-x-clip bg-background">
      <div className="menu-scenery pointer-events-none fixed inset-0 -z-10" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-slate-950/35" aria-hidden="true" />
      <main id="main-content" className="mx-auto flex min-h-svh max-w-6xl items-center justify-center px-3 py-6 sm:px-6 sm:py-10">
        {children}
      </main>
      <footer className="px-6 pb-5 text-center text-xs font-medium text-white/85">
        <img src="/assets/logo_jungle_gaming.svg" alt="Jungle Gaming" className="mx-auto mb-2 h-7 w-auto" />
        Pirate Battle · Single-player naval adventure
      </footer>
    </div>
  )
}
