import { db } from '@/db/schema'
import type { User, Site, CrewMember, ActivityType, DailyReport } from '@/db/schema'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BackupData {
  version: number
  exported_at: string
  users: User[]
  sites: Site[]
  crew_members: CrewMember[]
  activity_types: ActivityType[]
  daily_reports: DailyReport[]
}

const BACKUP_VERSION = 1

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Serialise all database tables (except photo_blobs) to a JSON string.
 */
export async function exportDatabaseBackup(): Promise<string> {
  const [users, sites, crew_members, activity_types, daily_reports] = await Promise.all([
    db.users.toArray(),
    db.sites.toArray(),
    db.crew_members.toArray(),
    db.activity_types.toArray(),
    db.daily_reports.toArray(),
  ])

  const backup: BackupData = {
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    users,
    sites,
    crew_members,
    activity_types,
    daily_reports,
  }

  return JSON.stringify(backup, null, 2)
}

// ─── Import ───────────────────────────────────────────────────────────────────

function isBackupData(obj: unknown): obj is BackupData {
  if (typeof obj !== 'object' || obj === null) return false
  const b = obj as Record<string, unknown>
  return (
    typeof b.version === 'number' &&
    typeof b.exported_at === 'string' &&
    Array.isArray(b.users) &&
    Array.isArray(b.sites) &&
    Array.isArray(b.crew_members) &&
    Array.isArray(b.activity_types) &&
    Array.isArray(b.daily_reports)
  )
}

/**
 * Clear all database tables and restore from a JSON backup string.
 * Validates the JSON structure before any destructive operation.
 * photo_blobs are NOT restored (excluded from backup).
 */
export async function importDatabaseBackup(jsonString: string): Promise<void> {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonString)
  } catch {
    throw new Error('Invalid JSON: could not parse backup file.')
  }

  if (!isBackupData(parsed)) {
    throw new Error(
      'Invalid backup format: missing required tables or wrong structure.',
    )
  }

  if (parsed.version !== BACKUP_VERSION) {
    throw new Error(
      `Backup version mismatch: expected v${BACKUP_VERSION}, got v${parsed.version}.`,
    )
  }

  // Clear all tables in a transaction
  await db.transaction('rw', [db.users, db.sites, db.crew_members, db.activity_types, db.daily_reports], async () => {
    await Promise.all([
      db.users.clear(),
      db.sites.clear(),
      db.crew_members.clear(),
      db.activity_types.clear(),
      db.daily_reports.clear(),
    ])

    await Promise.all([
      db.users.bulkAdd(parsed.users),
      db.sites.bulkAdd(parsed.sites),
      db.crew_members.bulkAdd(parsed.crew_members),
      db.activity_types.bulkAdd(parsed.activity_types),
      db.daily_reports.bulkAdd(parsed.daily_reports),
    ])
  })
}

// ─── Download helper ──────────────────────────────────────────────────────────

/**
 * Trigger a browser download of the given JSON string as a .json file.
 */
export function downloadBackup(json: string, filename: string): void {
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.json') ? filename : `${filename}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
