import type { ReactNode } from 'react'

export interface MenuActionsProps {
  onPlay?: () => void
  onOptions?: () => void
}

export interface MainMenuProps extends MenuActionsProps {
  footerContent?: ReactNode
  rankingContent: ReactNode
  historyContent: ReactNode
}
