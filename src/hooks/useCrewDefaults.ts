import { useEffect, useState } from 'react';
import { db } from '@/db/schema';
import type { DailyReport, DailyReportEntry } from '@/db/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CrewDefaults {
  /** The source report that defaults are derived from */
  sourceReport: DailyReport;
  /** Site id from the previous report */
  siteId: string;
  /** Crew entries with their activity assignments */
  entries: DailyReportEntry[];
}

export interface UseCrewDefaultsResult {
  defaults: CrewDefaults | null;
  isLoading: boolean;
  /** Pre-fill a new report form with yesterday's crew and activity data */
  applyDefaults: (targetDate: string, submittedBy: string) => Promise<string | null>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Queries the most recent submitted report and returns crew / site / activity
 * defaults for the "Continue Yesterday" feature.
 */
export function useCrewDefaults(): UseCrewDefaultsResult {
  const [defaults, setDefaults] = useState<CrewDefaults | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const submitted = await db.daily_reports
          .where('status')
          .equals('submitted')
          .toArray();

        if (submitted.length === 0) {
          if (!cancelled) setDefaults(null);
          return;
        }

        // Pick the most recent by date
        const latest = submitted.sort((a, b) => b.date.localeCompare(a.date))[0];

        if (!cancelled) {
          setDefaults({
            sourceReport: latest,
            siteId: latest.site_id,
            entries: latest.entries,
          });
        }
      } catch (err) {
        console.error('useCrewDefaults load error:', err);
        if (!cancelled) setDefaults(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  /**
   * Create a new draft report pre-filled with crew / activity data from the
   * most recent submitted report.
   *
   * @returns the new report id, or null if there are no defaults to apply.
   */
  async function applyDefaults(
    targetDate: string,
    submittedBy: string,
  ): Promise<string | null> {
    if (!defaults) return null;

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    // Clone entries with fresh IDs so they don't collide
    const clonedEntries: DailyReportEntry[] = defaults.entries.map(entry => ({
      ...entry,
      id: crypto.randomUUID(),
      hours_regular: 0,
      hours_overtime: 0,
      notes: '',
    }));

    await db.daily_reports.add({
      id,
      date: targetDate,
      site_id: defaults.siteId,
      submitted_by: submittedBy,
      status: 'draft',
      notes: '',
      created_at: now,
      updated_at: now,
      submitted_at: null,
      synced_at: null,
      entries: clonedEntries,
      photos: [],
    });

    return id;
  }

  return { defaults, isLoading, applyDefaults };
}
