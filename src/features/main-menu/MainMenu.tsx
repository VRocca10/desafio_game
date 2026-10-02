import { MenuNavigation } from './components/MenuNavigation'
import { MenuScene } from './components/MenuScene'
import { MenuAudio } from './components/MenuAudio'
import type { MainMenuProps } from './types'
import './main-menu.css'

export function MainMenu(props: MainMenuProps) {
  return (
    <MenuScene>
      <MenuNavigation {...props} />
      <MenuAudio hiddenControls />
    </MenuScene>
  )
}
