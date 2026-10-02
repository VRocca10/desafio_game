import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { MenuActions } from './MenuActions'
import { MenuPanel } from './MenuPanel'
import type { MainMenuProps } from '../types'

export function MenuNavigation({ rankingContent, historyContent, ...actions }: MainMenuProps) {
  const [view, setView] = useState('harbor')
  const navigation = <TabsList aria-label="Captain's log" className="captain-tabs">
    <TabsTrigger value="ranking" className="menu-secondary">Ranking</TabsTrigger>
    <TabsTrigger value="history" className="menu-secondary">Match History</TabsTrigger>
  </TabsList>
  return (
    <Tabs value={view} onValueChange={setView} className="captain-navigation">
      <MenuPanel showTitle={view === 'harbor'} wide={view !== 'harbor'}>
      {view !== 'harbor' && <><h1 className="captain-heading">Captain's Log</h1>{navigation}</>}
      <TabsContent value="harbor" className="harbor-content">
        <MenuActions {...actions} />
        <img className="menu-ship" src="/assets/png/retina/ships/ship_2.png" alt="" />
        <p className="menu-tagline">Navigate the islands. Survive the battle.</p>
        {view === 'harbor' && navigation}
      </TabsContent>
      <TabsContent value="ranking" className="captain-ledger-content">
        {rankingContent}
      </TabsContent>
      <TabsContent value="history" className="captain-ledger-content">
        {historyContent}
      </TabsContent>
      {view !== 'harbor' && <TabsList className="captain-back"><TabsTrigger value="harbor" aria-label="Harbor" className="menu-action">Main Menu</TabsTrigger></TabsList>}
      </MenuPanel>
    </Tabs>
  )
}
