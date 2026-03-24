import type { FieldLogDB, User } from '@/db/schema';

// ─── Session Types ─────────────────────────────────────────────────────────────

/** User shape stored in sessionStorage — pin_hash is intentionally omitted. */
export type SessionUser = Omit<User, 'pin_hash'>;

// ─── PIN Hashing ──────────────────────────────────────────────────────────────

/**
 * Hash a PIN string using SubtleCrypto SHA-256.
 * Returns a hex-encoded digest.
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a PIN against a stored hash.
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  const computed = await hashPin(pin);
  return computed === hash;
}

// ─── Default Admin ────────────────────────────────────────────────────────────

/**
 * Create a default admin user (PIN: 000000) if no users exist.
 */
export async function createDefaultAdmin(db: FieldLogDB): Promise<void> {
  const count = await db.users.count();
  if (count > 0) return;

  const now = new Date().toISOString();
  const pinHash = await hashPin('000000');

  const adminUser: User = {
    id: crypto.randomUUID(),
    username: 'admin',
    display_name: 'Administrator',
    role: 'admin',
    pin_hash: pinHash,
    created_at: now,
    updated_at: now,
  };

  await db.users.add(adminUser);
}

// ─── Session Storage ──────────────────────────────────────────────────────────

const SESSION_KEY = 'fieldlog_current_user';

/**
 * Get the currently authenticated user from sessionStorage.
 * Returns a SessionUser (without pin_hash) or null if not logged in.
 */
export function getCurrentUser(): SessionUser | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

/**
 * Store the current user in sessionStorage.
 * pin_hash is stripped before storage so it is never exposed in sessionStorage.
 */
export function setCurrentUser(user: User): void {
  const { pin_hash: _, ...sessionUser } = user;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
}

/**
 * Clear the current user session (logout).
 */
export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
