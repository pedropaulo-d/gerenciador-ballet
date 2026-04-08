import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

/**
 * Public Supabase client (anon key).
 * Use only in Client Components for auth flows.
 * After RLS hardening, this client has NO access to data tables.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Server-side Supabase client (service_role key).
 * Use in Server Actions and API routes only — NEVER expose to the browser.
 * Bypasses RLS, so all access control is handled in application code.
 */
export function getServiceSupabase() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (server-only, never NEXT_PUBLIC_)."
    );
  }
  return createClient(supabaseUrl, serviceRoleKey);
}
