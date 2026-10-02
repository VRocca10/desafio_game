import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/shared/components/ui/button'
import { readScenario, saveScenario, scenarios, type Scenario } from './mocks/scenarios'
import { resetRecords } from './mocks/store'
import { clearJournalResults } from '@/shared/matches/storage'

export function NetworkScenarios({ onReset, embedded = false }: { onReset: () => void; embedded?: boolean }) {
  const [scenario, setScenario] = useState(readScenario)
  const client = useQueryClient()
  const content = <div className="network-scenarios-content text-left text-sm">
    <div className="my-3 grid gap-2"><label htmlFor="network-scenario">Network scenario</label>
      <select id="network-scenario" value={scenario} className="rounded bg-slate-950 p-2" onChange={(event) => {
        const value = event.target.value as Scenario
        saveScenario(value); setScenario(value); void import('./mocks/handlers').then(({ resetRequestSequence }) => resetRequestSequence())
        void client.invalidateQueries({ queryKey: ['matches'] })
      }}>{scenarios.map((value) => <option key={value}>{value}</option>)}</select>
    </div>
    <p className="mb-3">Demo scenarios affect ranking and history only. Reset clears this browser's match records and pending submissions.</p>
    <Button className="menu-secondary" variant="outline" onClick={() => {
      resetRecords(); clearJournalResults(); saveScenario('success'); setScenario('success'); void import('./mocks/handlers').then(({ resetRequestSequence }) => resetRequestSequence()); onReset()
      void client.resetQueries({ queryKey: ['matches'] })
    }}>Reset demo data</Button>
  </div>
  return embedded ? content : <details className="mt-4 rounded border border-primary/20 p-3 text-left text-xs"><summary className="cursor-pointer">Network demo</summary>{content}</details>
}
