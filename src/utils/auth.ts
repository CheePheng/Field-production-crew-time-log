import type { FieldLogDB, User } from '@/db/schema';

// ─── Session Types ─────────────────────────────────────────────────────────────

/** User shape stored in sessionStorage — pin_hash and pin_salt are intentionally omitted. */
export type SessionUser = Omit<User, 'pin_hash' | 'pin_salt'>;

// ─── PIN Hashing ──────────────────────────────────────────────────────────────

/**
 * Generate a random 16-byte salt as a hex string.
 */
export function generateSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a PIN string using PBKDF2 with SHA-256 and 100,000 iterations.
 * @param pin      The plain-text PIN to hash.
 * @param saltHex  A hex-encoded 16-byte salt (from generateSalt).
 * Returns a hex-encoded 256-bit derived key.
 */
export async function hashPin(pin: string, saltHex: string): Promise<string> {
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 },
    keyMaterial, 256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a PIN against a stored hash using the user's salt.
 */
export async function verifyPin(pin: string, hash: string, saltHex: string): Promise<boolean> {
  const computed = await hashPin(pin, saltHex);
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
  const pinSalt = generateSalt();
  const pinHash = await hashPin('000000', pinSalt);

  const adminUser: User = {
    id: crypto.randomUUID(),
    username: 'admin',
    display_name: 'Administrator',
    role: 'admin',
    pin_hash: pinHash,
    pin_salt: pinSalt,
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
  const { pin_hash: _hash, pin_salt: _salt, ...sessionUser } = user;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
}

/**
 * Clear the current user session (logout).
 */
export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
