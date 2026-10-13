import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configurationError = !url || !key
  ? 'Team Pulse is not configured. Ask your administrator to configure the authentication service.'
  : key.startsWith('sb_secret_') ? 'Invalid public authentication configuration.' : null;
export const supabase = configurationError ? null : createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
});
export function requireSupabase() {
  if (!supabase) throw new Error(configurationError ?? 'Authentication unavailable.');
  return supabase;
}
