import type { ReactNode } from 'react'

export function MenuPanel({ children }: { children: ReactNode }) {
  return (
    <section aria-labelledby="game-title" className="menu-panel w-full max-w-xl px-1 py-3 sm:px-5 sm:py-5">
      <header className="text-center">
        <h1 id="game-title">
          <span className="sr-only">Pirate Battle</span>
          <img
            src="/assets/png/default/ui/menu/title_pirate_battle.png"
            srcSet="/assets/png/retina/ui/menu/title_pirate_battle.png 2x"
            alt="" width={384} height={128}
            className="mx-auto h-auto w-full max-w-96"
          />
        </h1>
        <p className="mt-1 mb-7 text-[10px] font-bold tracking-[0.22em] text-primary uppercase sm:text-xs">
          Set sail. Take command.
        </p>
      </header>
      {children}
    </section>
  )
}
