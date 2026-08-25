import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return browserClient;
}

export type DashboardMetrics = {
  employees: number;
  onSite: number;
  activeTransfers: number;
  openIncidents: number;
  facilities: number;
};

export type DashboardIncident = {
  id: string;
  title: string;
  severity: string;
  status: string;
  occurred_at: string;
  facilities: { name_ar: string; name_en: string } | null;
};

export type DashboardTransfer = {
  id: string;
  status: string;
  starts_at: string;
  employees: { first_name_ar: string; second_name_ar: string; first_name_en: string | null; second_name_en: string | null } | null;
  from_facility: { name_ar: string; name_en: string } | null;
  to_facility: { name_ar: string; name_en: string } | null;
};

export type FacilityAttendance = {
  id: string;
  name_ar: string;
  name_en: string;
  active_count: number;
};

async function countRows(client: SupabaseClient, table: string, apply?: (query: any) => any): Promise<number> {
  let query: any = client.from(table).select('*', { count: 'exact', head: true });
  if (apply) query = apply(query);
  const result = await query;
  if (result.error) throw result.error;
  return result.count ?? 0;
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error('SUPABASE_NOT_CONFIGURED');

  const [employees, onSite, activeTransfers, openIncidents, facilities] = await Promise.all([
    countRows(client, 'employees', q => q.eq('is_active', true)),
    countRows(client, 'attendance_sessions', q => q.is('check_out_at', null).eq('status', 'active')),
    countRows(client, 'transfer_requests', q => q.in('status', ['approved', 'active'])),
    countRows(client, 'incidents', q => q.in('status', ['open', 'investigating'])),
    countRows(client, 'facilities', q => q.eq('is_active', true)),
  ]);

  return { employees, onSite, activeTransfers, openIncidents, facilities };
}

export async function fetchRecentIncidents(limit = 5): Promise<DashboardIncident[]> {
  const client = getSupabaseBrowserClient();
  if (!client) return [];
  const { data, error } = await client
    .from('incidents')
    .select('id,title,severity,status,occurred_at,facilities(name_ar,name_en)')
    .order('occurred_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as DashboardIncident[];
}

export async function fetchRecentTransfers(limit = 5): Promise<DashboardTransfer[]> {
  const client = getSupabaseBrowserClient();
  if (!client) return [];
  const { data, error } = await client
    .from('transfer_requests')
    .select('id,status,starts_at,employees(first_name_ar,second_name_ar,first_name_en,second_name_en),from_facility:facilities!transfer_requests_from_facility_id_fkey(name_ar,name_en),to_facility:facilities!transfer_requests_to_facility_id_fkey(name_ar,name_en)')
    .order('starts_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as DashboardTransfer[];
}

export async function fetchFacilityAttendance(limit = 5): Promise<FacilityAttendance[]> {
  const client = getSupabaseBrowserClient();
  if (!client) return [];
  const { data: facilities, error } = await client
    .from('facilities')
    .select('id,name_ar,name_en')
    .eq('is_active', true)
    .limit(limit);
  if (error) throw error;
  const rows = await Promise.all((facilities ?? []).map(async facility => ({
    ...facility,
    active_count: await countRows(client, 'attendance_sessions', q => q.eq('facility_id', facility.id).is('check_out_at', null).eq('status', 'active')),
  })));
  return rows.sort((a, b) => b.active_count - a.active_count);
}

export function subscribeToOperationalChanges(onChange: () => void): () => void {
  const client = getSupabaseBrowserClient();
  if (!client) return () => undefined;
  const channel = client
    .channel('work-scope-dashboard-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_sessions' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transfer_requests' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, onChange)
    .subscribe();
  return () => { void client.removeChannel(channel); };
}
