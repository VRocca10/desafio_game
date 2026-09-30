import { ScrollText } from 'lucide-react'

export function MatchHistoryPanel() {
  return (
    <>
      <ScrollText aria-hidden="true" className="mx-auto mb-4 size-10 text-primary" />
      <h2 className="text-xl font-semibold">Your captain’s log</h2>
      <p className="mx-auto mt-3 max-w-xs leading-relaxed text-muted-foreground">
        Match history is coming soon. Your completed voyages, scores and results will appear here.
      </p>
    </>
  )
}
