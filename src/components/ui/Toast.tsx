import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: string
  message: string
  type: ToastType
  /** true while the toast is visible, false when fading out */
  visible: boolean
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

// ─── Styling helpers ──────────────────────────────────────────────────────────

const typeConfig: Record<
  ToastType,
  { bg: string; border: string; icon: string }
> = {
  success: {
    bg: 'bg-success',
    border: 'border-green-400',
    icon: '✓',
  },
  error: {
    bg: 'bg-danger',
    border: 'border-red-400',
    icon: '✕',
  },
  info: {
    bg: 'bg-blue-600',
    border: 'border-blue-400',
    icon: 'ℹ',
  },
  warning: {
    bg: 'bg-timber',
    border: 'border-amber-400',
    icon: '⚠',
  },
}

// ─── Single Toast ─────────────────────────────────────────────────────────────

function ToastItem({ toast }: { toast: ToastItem }) {
  const cfg = typeConfig[toast.type]

  return (
    <div
      className={[
        'flex items-center gap-3 px-4 py-3',
        'rounded-xl border shadow-lg',
        'text-white text-sm font-semibold',
        'min-w-[280px] max-w-[90vw]',
        'transition-all duration-300 ease-out',
        cfg.bg,
        cfg.border,
        toast.visible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-4 opacity-0',
      ].join(' ')}
    >
      <span className="text-base font-bold shrink-0" aria-hidden="true">
        {cfg.icon}
      </span>
      <span className="flex-1">{toast.message}</span>
    </div>
  )
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = useCallback((id: string) => {
    // First fade out
    setToasts(prev =>
      prev.map(t => (t.id === id ? { ...t, visible: false } : t))
    )
    // Then remove after animation
    const removeTimer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 300)
    timeoutsRef.current.set(`remove-${id}`, removeTimer)
  }, [])

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = crypto.randomUUID()

      setToasts(prev => [...prev, { id, message, type, visible: false }])

      // Trigger enter animation on next tick
      const enterTimer = setTimeout(() => {
        setToasts(prev =>
          prev.map(t => (t.id === id ? { ...t, visible: true } : t))
        )
      }, 10)
      timeoutsRef.current.set(`enter-${id}`, enterTimer)

      // Auto-dismiss after 3 seconds
      const dismissTimer = setTimeout(() => {
        removeToast(id)
      }, 3000)
      timeoutsRef.current.set(`dismiss-${id}`, dismissTimer)
    },
    [removeToast]
  )

  // Cleanup on unmount
  useEffect(() => {
    const timeouts = timeoutsRef.current
    return () => {
      timeouts.forEach(t => clearTimeout(t))
    }
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Notifications"
        className="fixed bottom-safe bottom-20 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}
      >
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}
