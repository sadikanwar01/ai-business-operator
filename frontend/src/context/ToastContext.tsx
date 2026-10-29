import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Check, Info, TriangleAlert, X } from 'lucide-react'
import { cn } from '../lib/format'

type ToastTone = 'success' | 'info' | 'error'

interface Toast {
  id: number
  tone: ToastTone
  title: string
  detail?: string
}

const ToastContext = createContext<{
  notify: (toast: { tone?: ToastTone; title: string; detail?: string }) => void
} | null>(null)

let counter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    ({ tone = 'info', title, detail }: { tone?: ToastTone; title: string; detail?: string }) => {
      counter += 1
      const id = counter
      setToasts((prev) => [...prev, { id, tone, title, detail }])
      window.setTimeout(() => dismiss(id), 5200)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[80] flex w-[min(380px,calc(100vw-40px))] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="animate-in-up pointer-events-auto flex items-start gap-3 rounded-[10px] border border-line bg-surface-2 px-4 py-3 shadow-[0_10px_30px_-12px_rgba(16,22,20,0.18)]"
          >
            <span
              className={cn(
                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full',
                toast.tone === 'success' && 'bg-positive-soft text-positive',
                toast.tone === 'error' && 'bg-critical-soft text-critical',
                toast.tone === 'info' && 'bg-indigo-soft text-indigo-ink',
              )}
            >
              {toast.tone === 'success' ? (
                <Check size={12} strokeWidth={2.6} />
              ) : toast.tone === 'error' ? (
                <TriangleAlert size={12} strokeWidth={2.6} />
              ) : (
                <Info size={12} strokeWidth={2.6} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium leading-snug text-ink">{toast.title}</p>
              {toast.detail ? (
                <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{toast.detail}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="rounded p-0.5 text-ink-4 transition-colors hover:text-ink-2"
              aria-label="Dismiss"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
