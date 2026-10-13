import { createClient } from '@supabase/supabase-js';
import { publicConfigurationError } from './publicConfiguration';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configurationError = publicConfigurationError(url,key,import.meta.env.PROD);
export const noStoreFetch:typeof fetch=(input,init)=>fetch(input,{...init,cache:'no-store'});
export const supabase = configurationError ? null : createClient(url, key, {
  global:{fetch:noStoreFetch},
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
});
export function requireSupabase() {
  if (!supabase) throw new Error(configurationError ?? 'Authentication unavailable.');
  return supabase;
}
