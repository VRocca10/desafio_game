import { Button } from '@/shared/components/ui/button'
import type { useRegistration } from './useRegistration'
export type Registration = ReturnType<typeof useRegistration>
export function RegistrationStatus({ registration }: { registration: Registration }) {
  const { journal, mutation, retry, storageError } = registration
  return <div className="space-y-2 text-sm" aria-live="polite">
    {storageError && <p role="alert">Browser storage is unavailable. Keep this page open to preserve pending results.</p>}
    <p>{mutation.isPending ? 'Registering matches…' : journal.pending.length ? `${journal.pending.length} match(es) pending registration.` : journal.last ? 'Match registered.' : 'No completed matches yet.'}</p>
    {mutation.isError && journal.pending.length > 0 && <p role="alert">Registration failed. Your pending matches can be retried.</p>}
    {journal.pending.length > 0 && <Button disabled={mutation.isPending} variant="outline" onClick={retry}>Retry registration</Button>}
  </div>
}
