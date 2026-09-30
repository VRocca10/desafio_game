import { Trophy } from 'lucide-react'

export function RankingPanel() {
  return (
    <>
      <Trophy aria-hidden="true" className="mx-auto mb-4 size-10 text-primary" />
      <h2 className="text-xl font-semibold">Legends of the sea</h2>
      <p className="mx-auto mt-3 max-w-xs leading-relaxed text-muted-foreground">
        The leaderboard is being prepared. Rankings will compare voyages played with the same settings.
      </p>
    </>
  )
}
