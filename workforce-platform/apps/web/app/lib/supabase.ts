import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: { eventsPerSecond: 10 },
      },
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

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error('SUPABASE_NOT_CONFIGURED');

  const [employees, onSite, transfers, incidents, facilities] = await Promise.all([
    client.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true),
    client.from('attendance_sessions').select('*', { count: 'exact', head: true }).is('check_out_at', null),
    client.from('transfer_requests').select('*', { count: 'exact', head: true }).in('status', ['approved', 'active']),
    client.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['open', 'investigating']),
    client.from('facilities').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ]);

  const firstError = [employees, onSite, transfers, incidents, facilities].find(item => item.error)?.error;
  if (firstError) throw firstError;

  return {
    employees: employees.count ?? 0,
    onSite: onSite.count ?? 0,
    activeTransfers: transfers.count ?? 0,
    openIncidents: incidents.count ?? 0,
    facilities: facilities.count ?? 0,
  };
}
