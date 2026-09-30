import { Anchor, ScrollText, Trophy } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { ControlsGuide } from './ControlsGuide'
import { MenuActions } from './MenuActions'
import type { MainMenuProps } from '../types'

export function MenuNavigation({ rankingContent, historyContent, ...actions }: MainMenuProps) {
  return (
    <Tabs defaultValue="harbor" className="gap-6">
      <TabsList aria-label="Main menu" className="grid w-full grid-cols-3 group-data-horizontal/tabs:h-auto border border-primary/25 bg-slate-950/30 p-1">
        <TabsTrigger value="harbor" className="min-h-11 gap-1 text-xs data-active:bg-primary/15 data-active:text-primary sm:text-sm">
          <Anchor aria-hidden="true" className="hidden sm:block" /> Harbor
        </TabsTrigger>
        <TabsTrigger value="ranking" className="min-h-11 gap-1 text-xs data-active:bg-primary/15 data-active:text-primary sm:text-sm">
          <Trophy aria-hidden="true" className="hidden sm:block" /> Ranking
        </TabsTrigger>
        <TabsTrigger value="history" className="min-h-11 gap-1 text-xs data-active:bg-primary/15 data-active:text-primary sm:text-sm">
          <ScrollText aria-hidden="true" className="hidden sm:block" /> Match History
        </TabsTrigger>
      </TabsList>
      <TabsContent value="harbor">
        <MenuActions {...actions} />
        <p className="mt-5 text-center text-sm font-medium text-primary/90">Navigate the islands. Survive the battle.</p>
        <ControlsGuide />
      </TabsContent>
      <TabsContent value="ranking" className="py-8 text-center">
        {rankingContent}
      </TabsContent>
      <TabsContent value="history" className="py-8 text-center">
        {historyContent}
      </TabsContent>
    </Tabs>
  )
}
