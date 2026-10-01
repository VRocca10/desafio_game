import { useCallback, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import { confirmResult, readJournal, rememberResult } from '@/shared/matches/storage'
import type { MatchResult } from '@/shared/matches/contracts'

export function useRegistration() {
  const queryClient = useQueryClient()
  const [journal, setJournal] = useState(readJournal)
  const [storageError, setStorageError] = useState(false)
  const busy = useRef(false)
  const mutation = useMutation({
    mutationFn: async (results: MatchResult[]) => {
      for (const result of results) {
        await api.post<MatchResult>('/matches', result)
        if (!confirmResult(result.id)) setStorageError(true)
        setJournal({ ...readJournal() })
        await queryClient.invalidateQueries({ queryKey: ['matches'] })
      }
    }, retry: 0,
    onSettled: () => { busy.current = false; setJournal({ ...readJournal() }) },
  })
  const submit = mutation.mutate
  const retry = useCallback(() => {
    if (busy.current) return
    const pending = readJournal().pending
    if (!pending.length) return
    busy.current = true; submit(pending)
  }, [submit])
  const complete = useCallback((result: MatchResult) => {
    if (!rememberResult(result)) setStorageError(true)
    setJournal({ ...readJournal() }); retry()
  }, [retry])
  return { journal, complete, retry, mutation, storageError, refresh: () => setJournal({ ...readJournal() }) }
}
