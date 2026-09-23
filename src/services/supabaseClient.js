import { createClient } from '@supabase/supabase-js';

// Retrieve Supabase credentials with fallback across localStorage, Vite, and Next.js conventions
export const getSupabaseConfig = () => {
  let url = '';
  let key = '';

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      url = window.localStorage.getItem('vw_supabase_url') || '';
      key = window.localStorage.getItem('vw_supabase_anon_key') || '';
    } catch {
      // ignore
    }
  }

  if (!url) {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      url = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
    } else if (typeof process !== 'undefined' && process.env) {
      url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    }
  }

  if (!key) {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      key = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    } else if (typeof process !== 'undefined' && process.env) {
      key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    }
  }

  return {
    url: url ? url.trim() : '',
    key: key ? key.trim() : '',
  };
};

export const saveSupabaseConfig = (url, key) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      if (url) window.localStorage.setItem('vw_supabase_url', url.trim());
      else window.localStorage.removeItem('vw_supabase_url');

      if (key) window.localStorage.setItem('vw_supabase_anon_key', key.trim());
      else window.localStorage.removeItem('vw_supabase_anon_key');
    } catch (err) {
      console.warn('Could not save Supabase config to localStorage:', err);
    }
  }
};

const currentConfig = getSupabaseConfig();
export const supabaseUrl = currentConfig.url;
export const supabaseAnonKey = currentConfig.key;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-anon-key')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

/**
 * Creates an isolated Supabase client without session persistence,
 * allowing Admin to register new member accounts without interrupting the current Admin session.
 */
export const getIsolatedAuthClient = () => {
  if (!isSupabaseConfigured) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};

if (!isSupabaseConfigured) {
  console.info(
    'ℹ️ Supabase credentials not set or using placeholders. App running in robust local storage mode.'
  );
} else {
  console.info('🔌 Supabase client successfully initialized:', supabaseUrl);
}

