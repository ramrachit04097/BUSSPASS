import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

const STORAGE_KEY_URL = 'buspass_supabase_url';
const STORAGE_KEY_KEY = 'buspass_supabase_key';

export function getStoredSupabaseConfig(): SupabaseConfig {
  let supabaseUrl = localStorage.getItem(STORAGE_KEY_URL) || import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = localStorage.getItem(STORAGE_KEY_KEY) || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  // Automatically normalize dashboard URL (e.g. https://supabase.com/dashboard/project/aqvumppbhzwxifxeqotl)
  // into correct Supabase API URL (https://aqvumppbhzwxifxeqotl.supabase.co)
  if (supabaseUrl.includes('supabase.com/dashboard/project/')) {
    const parts = supabaseUrl.split('/project/');
    if (parts[1]) {
      const ref = parts[1].split('/')[0].trim();
      if (ref) {
        supabaseUrl = `https://${ref}.supabase.co`;
      }
    }
  }

  return { supabaseUrl: supabaseUrl.trim(), supabaseAnonKey: supabaseAnonKey.trim() };
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  let url = config.supabaseUrl.trim();
  if (url.includes('supabase.com/dashboard/project/')) {
    const parts = url.split('/project/');
    if (parts[1]) {
      const ref = parts[1].split('/')[0].trim();
      if (ref) {
        url = `https://${ref}.supabase.co`;
      }
    }
  }
  localStorage.setItem(STORAGE_KEY_URL, url);
  localStorage.setItem(STORAGE_KEY_KEY, config.supabaseAnonKey.trim());
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_KEY);
}

export function getSupabaseClient(): SupabaseClient | null {
  const { supabaseUrl, supabaseAnonKey } = getStoredSupabaseConfig();
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  try {
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase URL or API key is not configured.' };
  }
  try {
    const { error } = await client.from('routes').select('route_number').limit(1);
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        return { success: true, message: 'Connected to Supabase successfully! (Note: Please create database tables using the SQL schema below).' };
      }
      return { success: false, message: `Supabase connection error: ${error.message}` };
    }
    return { success: true, message: 'Successfully connected to Supabase database!' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Connection failed.' };
  }
}
