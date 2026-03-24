import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { db } from '@/db/schema';
import type { DailyReport } from '@/db/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

type CreateReportData = Omit<DailyReport, 'id' | 'created_at' | 'updated_at'>;
type UpdateReportData = Partial<Omit<DailyReport, 'id' | 'created_at'>>;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useReport() {
  // ── Create ────────────────────────────────────────────────────────────────

  async function createReport(data: CreateReportData): Promise<string> {
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
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async function updateReport(id: string, data: UpdateReportData): Promise<void> {
    const now = new Date().toISOString();
    await db.daily_reports.update(id, { ...data, updated_at: now });
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function submitReport(id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.daily_reports.update(id, {
      status: 'submitted',
      submitted_at: now,
      updated_at: now,
    });
  }

  // ── Read Single ───────────────────────────────────────────────────────────

  async function getReport(id: string): Promise<DailyReport | undefined> {
    return db.daily_reports.get(id);
  }

  // ── Read by Date Range ────────────────────────────────────────────────────

  async function getReportsByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<DailyReport[]> {
    return db.daily_reports
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  }

  // ── Yesterday / Most Recent ───────────────────────────────────────────────

  /**
   * Get the most recent submitted report, optionally filtered by siteId.
   * Used for the "Continue Yesterday" feature.
   */
  async function getYesterdayReport(siteId?: string): Promise<DailyReport | undefined> {
    let collection = db.daily_reports
      .where('status')
      .equals('submitted');

    if (siteId) {
      const all = await collection.toArray();
      const filtered = all.filter(r => r.site_id === siteId);
      return filtered.sort((a, b) => b.date.localeCompare(a.date))[0];
    }

    const all = await collection.toArray();
    return all.sort((a, b) => b.date.localeCompare(a.date))[0];
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function deleteReport(id: string): Promise<void> {
    const report = await db.daily_reports.get(id);
    if (report) {
      // Delete associated photo blobs
      const blobKeys = report.photos.map(p => p.blob_key);
      if (blobKeys.length > 0) {
        await db.photo_blobs.bulkDelete(blobKeys);
      }
    }
    await db.daily_reports.delete(id);
  }

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

// ─── Live Query Hook ──────────────────────────────────────────────────────────

/**
 * Reactive hook that returns all reports for a given date, updating live.
 */
export function useReportsForDate(date: string): DailyReport[] {
  const [reports, setReports] = useState<DailyReport[]>([]);

  useEffect(() => {
    const subscription = liveQuery(() =>
      db.daily_reports.where('date').equals(date).toArray()
    ).subscribe({
      next: setReports,
      error: (err: unknown) => console.error('useReportsForDate error:', err),
    });

    return () => subscription.unsubscribe();
  }, [date]);

  return reports;
}

/**
 * Reactive hook that returns all reports with a given status, updating live.
 */
export function useReportsByStatus(status: DailyReport['status']): DailyReport[] {
  const [reports, setReports] = useState<DailyReport[]>([]);

  useEffect(() => {
    const subscription = liveQuery(() =>
      db.daily_reports.where('status').equals(status).toArray()
    ).subscribe({
      next: setReports,
      error: (err: unknown) => console.error('useReportsByStatus error:', err),
    });

    return () => subscription.unsubscribe();
  }, [status]);

  return reports;
}
