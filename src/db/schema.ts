import Dexie, { type EntityTable } from 'dexie';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  display_name: string;
  role: 'admin' | 'supervisor' | 'viewer';
  pin_hash: string;
  created_at: string; // ISO8601
  updated_at: string; // ISO8601
}

export interface Site {
  id: string;
  name: string;
  location_label: string;
  gps_lat: number | null;
  gps_lng: number | null;
  is_active: boolean;
  created_at: string; // ISO8601
}

export interface CrewMember {
  id: string;
  name: string;
  ic_number: string;           // Malaysian IC for payroll
  role_label: string;          // e.g., "Chainsaw Operator"
  default_activity_id: string | null;
  is_active: boolean;
  created_at: string;          // ISO8601
}

export interface ActivityType {
  id: string;
  name: string;
  category: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;          // ISO8601
}

export interface DailyReportEntry {
  id: string;
  crew_member_id: string;
  crew_member_name: string;
  activity_type_id: string;
  activity_name: string;
  hours_regular: number;
  hours_overtime: number;
  notes: string;
}

export interface ReportPhoto {
  id: string;
  blob_key: string;
  thumbnail_base64: string;
  gps_lat: number | null;
  gps_lng: number | null;
  captured_at: string;         // ISO8601
  caption: string;
}

export interface DailyReport {
  id: string;
  date: string;                // YYYY-MM-DD
  site_id: string;
  submitted_by: string;
  status: 'draft' | 'submitted' | 'synced';
  notes: string;
  created_at: string;          // ISO8601
  updated_at: string;          // ISO8601
  submitted_at: string | null; // ISO8601
  synced_at: string | null;    // ISO8601
  entries: DailyReportEntry[];
  photos: ReportPhoto[];
}

export interface PhotoBlob {
  id: string;          // matches blob_key in ReportPhoto
  data: Blob;
  created_at: string;  // ISO8601
}

// ─── Database ─────────────────────────────────────────────────────────────────

export class FieldLogDB extends Dexie {
  users!: EntityTable<User, 'id'>;
  sites!: EntityTable<Site, 'id'>;
  crew_members!: EntityTable<CrewMember, 'id'>;
  activity_types!: EntityTable<ActivityType, 'id'>;
  daily_reports!: EntityTable<DailyReport, 'id'>;
  photo_blobs!: EntityTable<PhotoBlob, 'id'>;

  constructor() {
    super('FieldLogDB');

    this.version(1).stores({
      // primary key, then additional indexes
      users:           '&id, &username',
      sites:           '&id, is_active',
      crew_members:    '&id, is_active',
      activity_types:  '&id, is_active, sort_order',
      daily_reports:   '&id, date, site_id, status, [date+site_id]',
      photo_blobs:     '&id',
    });
  }
}

export const db = new FieldLogDB();
