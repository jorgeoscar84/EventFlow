import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Cliente admin de Supabase (service_role). Solo servidor.
 * Se usa para crear usuarios de Auth al aprovisionar empresas. PRD M2.
 */
export function createSupabaseAdminClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
