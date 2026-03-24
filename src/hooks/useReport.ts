import { useCallback, useEffect, useRef, useState } from 'react';
import { liveQuery } from 'dexie';
import { db } from '@/db/schema';
import type { DailyReport } from '@/db/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

type CreateReportData = Omit<DailyReport, 'id' | 'created_at' | 'updated_at'>;
type UpdateReportData = Partial<Omit<DailyReport, 'id' | 'created_at'>>;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useReport() {
  // ── Create ────────────────────────────────────────────────────────────────

  const createReport = useCallback(async function createReport(data: CreateReportData): Promise<string> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const report: DailyReport = {
      ...data,
      id,
      created_at: now,
      updated_at: now,
    };

    await db.daily_reports.add(report);
    return id;
  }, []);

  // ── Update ────────────────────────────────────────────────────────────────

  const updateReport = useCallback(async function updateReport(id: string, data: UpdateReportData): Promise<void> {
    const now = new Date().toISOString();
    await db.daily_reports.update(id, { ...data, updated_at: now });
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────

  const submitReport = useCallback(async function submitReport(id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.daily_reports.update(id, {
      status: 'submitted',
      submitted_at: now,
      updated_at: now,
    });
  }, []);

  // ── Read Single ───────────────────────────────────────────────────────────

  const getReport = useCallback(async function getReport(id: string): Promise<DailyReport | undefined> {
    return db.daily_reports.get(id);
  }, []);

  // ── Read by Date Range ────────────────────────────────────────────────────

  const getReportsByDateRange = useCallback(async function getReportsByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<DailyReport[]> {
    return db.daily_reports
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  }, []);

  // ── Yesterday / Most Recent ───────────────────────────────────────────────

  /**
   * Get the most recent submitted or synced report, optionally filtered by
   * siteId. Used for the "Continue Yesterday" feature.
   */
  const getYesterdayReport = useCallback(async function getYesterdayReport(siteId?: string): Promise<DailyReport | undefined> {
    if (siteId) {
      // Efficient path: filter by site_id at the index level, then check status
      const results = await db.daily_reports
        .where('site_id')
        .equals(siteId)
        .filter(r => r.status === 'submitted' || r.status === 'synced')
        .toArray();
      return results.sort((a, b) => b.date.localeCompare(a.date))[0];
    }

    const all = await db.daily_reports
      .where('status')
      .anyOf(['submitted', 'synced'])
      .toArray();
    return all.sort((a, b) => b.date.localeCompare(a.date))[0];
  }, []);

  // ── Delete ────────────────────────────────────────────────────────────────

  const deleteReport = useCallback(async function deleteReport(id: string): Promise<void> {
    const report = await db.daily_reports.get(id);
    if (report) {
      // Delete associated photo blobs
      const blobKeys = report.photos.map(p => p.blob_key);
      if (blobKeys.length > 0) {
        await db.photo_blobs.bulkDelete(blobKeys);
      }
    }
    await db.daily_reports.delete(id);
  }, []);

  return {
    createReport,
    updateReport,
    submitReport,
    getReport,
    getReportsByDateRange,
    getYesterdayReport,
    deleteReport,
  };
}

// ─── Live Query Hooks ─────────────────────────────────────────────────────────

export interface LiveQueryResult<T> {
  data: T;
  isLoading: boolean;
  error: unknown;
}

/**
 * Reactive hook that returns all reports for a given date, updating live.
 * Returns { data, isLoading, error } so callers can handle loading / error states.
 */
export function useReportsForDate(date: string): LiveQueryResult<DailyReport[]> {
  const [data, setData] = useState<DailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  // Track whether the first emission has arrived so isLoading flips only once
  const firstEmit = useRef(true);

  useEffect(() => {
    firstEmit.current = true;
    setIsLoading(true);
    setError(null);

    const subscription = liveQuery(() =>
      db.daily_reports.where('date').equals(date).toArray()
    ).subscribe({
      next: (rows) => {
        setData(rows);
        if (firstEmit.current) {
          setIsLoading(false);
          firstEmit.current = false;
        }
      },
      error: (err: unknown) => {
        console.error('useReportsForDate error:', err);
        setError(err);
        setIsLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  }, [date]);

  return { data, isLoading, error };
}

/**
 * Reactive hook that returns all reports with a given status, updating live.
 * Returns { data, isLoading, error } so callers can handle loading / error states.
 */
export function useReportsByStatus(status: DailyReport['status']): LiveQueryResult<DailyReport[]> {
  const [data, setData] = useState<DailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const firstEmit = useRef(true);

  useEffect(() => {
    firstEmit.current = true;
    setIsLoading(true);
    setError(null);

    const subscription = liveQuery(() =>
      db.daily_reports.where('status').equals(status).toArray()
    ).subscribe({
      next: (rows) => {
        setData(rows);
        if (firstEmit.current) {
          setIsLoading(false);
          firstEmit.current = false;
        }
      },
      error: (err: unknown) => {
        console.error('useReportsByStatus error:', err);
        setError(err);
        setIsLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  }, [status]);

  return { data, isLoading, error };
}
