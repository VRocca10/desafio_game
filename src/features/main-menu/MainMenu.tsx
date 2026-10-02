import { MenuNavigation } from './components/MenuNavigation'
import { MenuScene } from './components/MenuScene'
import { MenuAudio } from './components/MenuAudio'
import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { ControlsGuide } from './components/ControlsGuide'
import { MenuSupportDialog } from './components/MenuSupportDialog'
import type { MainMenuProps } from './types'
import './main-menu.css'

export function MainMenu({ networkContent, onLastResult, ...props }: MainMenuProps) {
  const [support, setSupport] = useState<'controls' | 'network' | null>(null)
  return (
    <MenuScene>
      <MenuNavigation {...props} supportContent={<nav className="menu-support-links" aria-label="Help and demonstration">
        <Button variant="link" onClick={() => setSupport('controls')}>Controls</Button>
        <Button variant="link" onClick={() => setSupport('network')}>Network scenarios</Button>
        {onLastResult && <Button variant="link" onClick={onLastResult}>Last result</Button>}
      </nav>} />
      <MenuAudio hiddenControls />
      {support && <MenuSupportDialog title={support === 'controls' ? "Captain's guide" : 'Network scenarios'} onClose={() => setSupport(null)}>
        {support === 'controls' ? <ControlsGuide embedded /> : networkContent}
      </MenuSupportDialog>}
    </MenuScene>
  )
}
