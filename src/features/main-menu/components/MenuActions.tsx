import { Button } from '@/shared/components/ui/button'
import type { MenuActionsProps } from '../types'

export function MenuActions({ onPlay, onOptions }: MenuActionsProps) {
  const isPreview = !onPlay || !onOptions
  return (
    <div className="flex flex-col items-center gap-2">
      <Button className="menu-action" disabled={!onPlay} onClick={onPlay} aria-describedby={isPreview ? 'menu-preview-note' : undefined}>
        Play
      </Button>
      <Button className="menu-action" disabled={!onOptions} onClick={onOptions} aria-describedby={isPreview ? 'menu-preview-note' : undefined}>
        Options
      </Button>
      {isPreview && <p id="menu-preview-note" className="mt-2 max-w-64 text-center text-xs leading-relaxed text-muted-foreground">
        Options are coming next. Set sail with Play.
      </p>}
    </div>
  )
}
