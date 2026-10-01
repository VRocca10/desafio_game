import { useEffect, useRef, type ReactNode } from 'react'

export function GameDialog({ children, label, onEscape }: { children: ReactNode; label: string; onEscape?: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return <dialog ref={ref} aria-label={label} className="m-auto max-h-[90dvh] w-[min(90vw,520px)] overflow-auto rounded-xl border border-primary/40 bg-slate-950 p-6 text-center text-foreground backdrop:bg-slate-950/80"
    onCancel={(event) => { event.preventDefault(); onEscape?.() }}>{children}</dialog>
}
