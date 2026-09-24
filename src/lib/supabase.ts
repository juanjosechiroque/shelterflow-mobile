import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/database.types';

export const SUPABASE_ENV_URL = 'EXPO_PUBLIC_SUPABASE_URL';
export const SUPABASE_ENV_KEY = 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY';

export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

export function readSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    return null;
  }

  return { url, publishableKey };
}

export function createSupabaseClient(
  config: SupabaseConfig = readSupabaseConfig() as SupabaseConfig,
): SupabaseClient<Database> {
  return createClient<Database>(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: AsyncStorage,
    },
  });
}

const config = readSupabaseConfig();
export const isSupabaseConfigured = config !== null;

export const supabase: SupabaseClient<Database> | null = config
  ? createSupabaseClient(config)
  : null;
