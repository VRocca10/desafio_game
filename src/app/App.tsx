import { MainMenu } from '@/features/main-menu'
import { RankingPanel } from '@/features/ranking'
import { MatchHistoryPanel } from '@/features/match-history'

export default function App() {
  return <MainMenu rankingContent={<RankingPanel />} historyContent={<MatchHistoryPanel />} />
}
