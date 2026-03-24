import type { FieldLogDB, User, Site, CrewMember, ActivityType, DailyReport } from '@/db/schema';
import { hashPin } from '@/utils/auth';

/**
 * Populate the database with sample development data.
 * Only runs if the database is empty (users table count is 0).
 */
export async function seedDatabase(db: FieldLogDB): Promise<void> {
  const userCount = await db.users.count();
  if (userCount > 0) return;

  const now = new Date().toISOString();

  // ── Users ──────────────────────────────────────────────────────────────────

  const adminPinHash = await hashPin('000000');
  const supervisorPinHash = await hashPin('123456');

  const users: User[] = [
    {
      id: crypto.randomUUID(),
      username: 'admin',
      display_name: 'Administrator',
      role: 'admin',
      pin_hash: adminPinHash,
      created_at: now,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      username: 'supervisor1',
      display_name: 'Ahmad Razif',
      role: 'supervisor',
      pin_hash: supervisorPinHash,
      created_at: now,
      updated_at: now,
    },
  ];

  // ── Sites ──────────────────────────────────────────────────────────────────

  const sites: Site[] = [
    {
      id: crypto.randomUUID(),
      name: 'Compartment 12A',
      location_label: 'Ulu Jelai Forest Reserve, Pahang',
      gps_lat: 4.3821,
      gps_lng: 101.7924,
      is_active: true,
      created_at: now,
    },
    {
      id: crypto.randomUUID(),
      name: 'Compartment 7B',
      location_label: 'Sungai Siput Forest Reserve, Perak',
      gps_lat: 4.8472,
      gps_lng: 101.0633,
      is_active: true,
      created_at: now,
    },
    {
      id: crypto.randomUUID(),
      name: 'Compartment 3C',
      location_label: 'Ulu Muda Forest Reserve, Kedah',
      gps_lat: 5.8107,
      gps_lng: 101.3244,
      is_active: false,
      created_at: now,
    },
  ];

  // ── Activity Types ─────────────────────────────────────────────────────────

  const activityTypes: ActivityType[] = [
    {
      id: crypto.randomUUID(),
      name: 'Felling',
      category: 'Harvesting',
      is_active: true,
      sort_order: 1,
      created_at: now,
    },
    {
      id: crypto.randomUUID(),
      name: 'Skidding',
      category: 'Harvesting',
      is_active: true,
      sort_order: 2,
      created_at: now,
    },
    {
      id: crypto.randomUUID(),
      name: 'Loading',
      category: 'Harvesting',
      is_active: true,
      sort_order: 3,
      created_at: now,
    },
    {
      id: crypto.randomUUID(),
      name: 'Road Maintenance',
      category: 'Infrastructure',
      is_active: true,
      sort_order: 4,
      created_at: now,
    },
    {
      id: crypto.randomUUID(),
      name: 'Scaling',
      category: 'Measurement',
      is_active: true,
      sort_order: 5,
      created_at: now,
    },
    {
      id: crypto.randomUUID(),
      name: 'General',
      category: 'General',
      is_active: true,
      sort_order: 6,
      created_at: now,
    },
  ];

  // ── Crew Members ───────────────────────────────────────────────────────────

  const fellingId = activityTypes[0].id;
  const skiddingId = activityTypes[1].id;
  const loadingId = activityTypes[2].id;
  const scalingId = activityTypes[4].id;
  const generalId = activityTypes[5].id;

  const crewMembers: CrewMember[] = [
    {
      id: crypto.randomUUID(),
      name: 'Mohd Fadzli bin Ismail',
      ic_number: '870312-05-1234',
      role_label: 'Chainsaw Operator',
      default_activity_id: fellingId,
      is_active: true,
      created_at: now,
    },
    {
      id: crypto.randomUUID(),
      name: 'Zulkifli bin Hamid',
      ic_number: '901125-08-5678',
      role_label: 'Chainsaw Operator',
      default_activity_id: fellingId,
      is_active: true,
      created_at: now,
    },
    {
      id: crypto.randomUUID(),
      name: 'Roslan bin Othman',
      ic_number: '851007-03-9012',
      role_label: 'Skidder Operator',
      default_activity_id: skiddingId,
      is_active: true,
      created_at: now,
    },
    {
      id: crypto.randomUUID(),
      name: 'Hairul Nizam bin Bakar',
      ic_number: '920614-14-3456',
      role_label: 'Loader Operator',
      default_activity_id: loadingId,
      is_active: true,
      created_at: now,
    },
    {
      id: crypto.randomUUID(),
      name: 'Azhar bin Salleh',
      ic_number: '780229-06-7890',
      role_label: 'Truck Driver',
      default_activity_id: loadingId,
      is_active: true,
      created_at: now,
    },
    {
      id: crypto.randomUUID(),
      name: 'Kamaruddin bin Yusof',
      ic_number: '831118-11-2345',
      role_label: 'Scaler',
      default_activity_id: scalingId,
      is_active: true,
      created_at: now,
    },
    {
      id: crypto.randomUUID(),
      name: 'Shahril bin Kassim',
      ic_number: '960403-07-6789',
      role_label: 'General Worker',
      default_activity_id: generalId,
      is_active: true,
      created_at: now,
    },
    {
      id: crypto.randomUUID(),
      name: 'Jamaluddin bin Talib',
      ic_number: '750815-02-0123',
      role_label: 'General Worker',
      default_activity_id: generalId,
      is_active: true,
      created_at: now,
    },
  ];

  // ── Sample Daily Report ────────────────────────────────────────────────────

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const reportDate = yesterday.toISOString().split('T')[0];

  const sampleReport: DailyReport = {
    id: crypto.randomUUID(),
    date: reportDate,
    site_id: sites[0].id,
    submitted_by: users[1].id,
    status: 'submitted',
    notes: 'Good weather. Completed felling in Block 3 and started skidding operations.',
    created_at: now,
    updated_at: now,
    submitted_at: now,
    synced_at: null,
    entries: [
      {
        id: crypto.randomUUID(),
        crew_member_id: crewMembers[0].id,
        crew_member_name: crewMembers[0].name,
        activity_type_id: activityTypes[0].id,
        activity_name: activityTypes[0].name,
        hours_regular: 8,
        hours_overtime: 1,
        notes: 'Felled 12 trees in Block 3',
      },
      {
        id: crypto.randomUUID(),
        crew_member_id: crewMembers[2].id,
        crew_member_name: crewMembers[2].name,
        activity_type_id: activityTypes[1].id,
        activity_name: activityTypes[1].name,
        hours_regular: 8,
        hours_overtime: 0,
        notes: 'Skidded logs to landing area',
      },
      {
        id: crypto.randomUUID(),
        crew_member_id: crewMembers[3].id,
        crew_member_name: crewMembers[3].name,
        activity_type_id: activityTypes[2].id,
        activity_name: activityTypes[2].name,
        hours_regular: 7,
        hours_overtime: 2,
        notes: '3 lorry loads dispatched',
      },
    ],
    photos: [],
  };

  // ── Bulk Insert ────────────────────────────────────────────────────────────

  await db.transaction('rw', [
    db.users,
    db.sites,
    db.activity_types,
    db.crew_members,
    db.daily_reports,
  ], async () => {
    await db.users.bulkAdd(users);
    await db.sites.bulkAdd(sites);
    await db.activity_types.bulkAdd(activityTypes);
    await db.crew_members.bulkAdd(crewMembers);
    await db.daily_reports.add(sampleReport);
  });

  console.info('[FieldLog] Seed data loaded successfully.');
}
