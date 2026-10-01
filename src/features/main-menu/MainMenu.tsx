import { MenuNavigation } from './components/MenuNavigation'
import { MenuPanel } from './components/MenuPanel'
import { MenuScene } from './components/MenuScene'
import { MenuAudio } from './components/MenuAudio'
import type { MainMenuProps } from './types'
import './main-menu.css'

export function MainMenu(props: MainMenuProps) {
  return (
    <MenuScene>
      <MenuPanel><MenuNavigation {...props} /><MenuAudio />{props.footerContent}</MenuPanel>
    </MenuScene>
  )
}
