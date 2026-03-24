import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { liveQuery } from 'dexie'
import { db } from '@/db/schema'
import type { User } from '@/db/schema'
import { verifyPin, setCurrentUser } from '@/utils/auth'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'

const PIN_LENGTH = 6

export function Login() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [users, setUsers] = useState<User[] | undefined>(undefined)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [digits, setDigits] = useState<string[]>(Array(PIN_LENGTH).fill(''))
  const [isLoading, setIsLoading] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)

  const inputRefs = useRef<Array<HTMLInputElement | null>>(
    Array(PIN_LENGTH).fill(null)
  )

  // Live query users from Dexie
  useEffect(() => {
    const subscription = liveQuery(() => db.users.toArray()).subscribe({
      next: rows => {
        setUsers(rows)
        if (rows.length > 0 && !selectedUserId) {
          setSelectedUserId(rows[0].id)
        }
      },
      error: err => {
        console.error('[Login] users query error:', err)
        setUsers([])
      },
    })
    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pin = digits.join('')
  const isComplete = pin.length === PIN_LENGTH && !digits.includes('')

  // ─── Digit input handling ────────────────────────────────────────────────────

  function handleDigitChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) return

    const char = raw[raw.length - 1]
    const next = digits.slice()
    next[index] = char
    setDigits(next)

    // Auto-advance to next box
    if (index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleDigitKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (digits[index]) {
        const next = digits.slice()
        next[index] = ''
        setDigits(next)
      } else if (index > 0) {
        const next = digits.slice()
        next[index - 1] = ''
        setDigits(next)
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'Enter' && isComplete) {
      handleSubmit()
    }
  }

  function clearPin() {
    setDigits(Array(PIN_LENGTH).fill(''))
    // Small delay so the DOM settles before focusing
    setTimeout(() => inputRefs.current[0]?.focus(), 0)
  }

  // ─── Submit ───────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!isComplete || !selectedUserId) return
    setIsLoading(true)

    try {
      const user: User | undefined = await db.users.get(selectedUserId)
      if (!user) {
        showToast('User not found.', 'error')
        triggerShake()
        return
      }

      const ok = await verifyPin(pin, user.pin_hash)
      if (!ok) {
        showToast('Incorrect PIN. Please try again.', 'error')
        triggerShake()
        return
      }

      setCurrentUser(user)
      navigate('/')
    } catch (err) {
      console.error('[Login] error:', err)
      showToast('Something went wrong. Please try again.', 'error')
      triggerShake()
    } finally {
      setIsLoading(false)
    }
  }

  function triggerShake() {
    setShakeKey(k => k + 1)
    clearPin()
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="gradient-hero min-h-screen flex flex-col items-center justify-center px-5 py-12">
      {/* Brand card */}
      <div className="glass px-6 py-7 w-full max-w-sm text-center mb-6">
        {/* Logo mark */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-forest shadow-lg mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-9 h-9"
            aria-hidden="true"
          >
            {/* Simple tree shape */}
            <path d="M12 2L4 14h16L12 2z" />
            <path d="M9 14v8h6v-8" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-forest tracking-tight">
          CCT PGL FieldLog
        </h1>
        <p className="text-forest/70 text-xs font-medium tracking-widest uppercase mt-1">
          Field Production · Crew Time Log
        </p>
      </div>

      {/* Login form */}
      <div className="glass px-6 py-7 w-full max-w-sm flex flex-col gap-5">
        {/* User selector */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="user-select" className="text-sm font-semibold text-forest">
            Select User
          </label>
          {users === undefined ? (
            <div className="h-[48px] rounded-xl bg-gray-100 animate-pulse" />
          ) : users.length === 0 ? (
            <p className="text-sm text-danger font-medium">No users found in database.</p>
          ) : (
            <select
              id="user-select"
              value={selectedUserId}
              onChange={e => {
                setSelectedUserId(e.target.value)
                clearPin()
              }}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-gray-200 bg-white text-base text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-forest-light/40 focus:border-forest-light appearance-none"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.display_name}
                  {u.role === 'admin'
                    ? ' (Admin)'
                    : u.role === 'supervisor'
                      ? ' (Supervisor)'
                      : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* PIN entry */}
        <div className="flex flex-col gap-3">
          <span className="text-sm font-semibold text-forest">Enter PIN</span>

          {/* Shake wrapper — key change restarts animation */}
          <div
            key={shakeKey}
            className={shakeKey > 0 ? 'animate-shake' : ''}
          >
            <div className="flex gap-2 justify-center">
              {digits.map((digit, i) => (
                <div key={i} className="relative flex-1 max-w-[44px]">
                  {/* Hidden actual input for keyboard interaction */}
                  <input
                    ref={el => { inputRefs.current[i] = el }}
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    value={digit}
                    onChange={e => handleDigitChange(i, e)}
                    onKeyDown={e => handleDigitKeyDown(i, e)}
                    onFocus={e => e.target.select()}
                    aria-label={`PIN digit ${i + 1} of ${PIN_LENGTH}`}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-default z-10"
                    autoComplete="off"
                    disabled={isLoading}
                  />
                  {/* Visual box */}
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => inputRefs.current[i]?.focus()}
                    className={[
                      'w-full aspect-square rounded-xl border-2',
                      'flex items-center justify-center',
                      'transition-all duration-150',
                      digit
                        ? 'border-forest bg-forest/5 shadow-sm'
                        : 'border-gray-200 bg-white',
                    ].join(' ')}
                    aria-hidden="true"
                  >
                    {digit ? (
                      <span className="block w-3 h-3 rounded-full bg-forest" />
                    ) : null}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-gray-400">
            Tap a box, then type your 6-digit PIN
          </p>
        </div>

        {/* Enter button */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
          disabled={!isComplete || isLoading || !selectedUserId}
          onClick={handleSubmit}
        >
          {isLoading ? 'Signing in…' : 'Enter'}
        </Button>

        {/* Clear PIN shortcut */}
        {digits.some(Boolean) && !isLoading && (
          <button
            type="button"
            onClick={clearPin}
            className="text-center text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
          >
            Clear PIN
          </button>
        )}
      </div>
    </div>
  )
}
