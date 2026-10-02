import type { ReactNode } from 'react'

export function MenuPanel({ children, showTitle = true, wide = false }: { children: ReactNode; showTitle?: boolean; wide?: boolean }) {
  return (
    <section aria-label={showTitle ? 'Pirate Battle menu' : "Captain's log"} className={`menu-panel ${wide ? 'menu-panel-wide' : ''}`}>
      {showTitle && <header className="menu-title text-center">
        <h1 id="game-title">
          <span className="sr-only">Pirate Battle</span>
          <img
            src="/assets/png/default/ui/menu/title_pirate_battle.png"
            srcSet="/assets/png/retina/ui/menu/title_pirate_battle.png 2x"
            alt="" width={384} height={128}
            className="mx-auto h-auto w-full"
          />
        </h1>
        <p className="mt-1 mb-7 text-[10px] font-bold tracking-[0.22em] text-primary uppercase sm:text-xs">
          Set sail. Take command.
        </p>
      </header>}
      {children}
    </section>
  )
}
