import type { ReactNode } from 'react'

export interface MenuActionsProps {
  onPlay?: () => void
  onOptions?: () => void
}

export interface MainMenuProps extends MenuActionsProps {
  rankingContent: ReactNode
  historyContent: ReactNode
  networkContent: ReactNode
  onLastResult?: () => void
}
