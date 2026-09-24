import { createClient } from '@supabase/supabase-js';

/**
 * Retrieve Supabase configuration cleanly across process.env (Next.js / Node)
 * and import.meta.env (Vite) conventions, with local persistence fallback.
 */
export const getSupabaseConfig = () => {
  let url = '';
  let key = '';

  // 1. Process environment variables (Next.js & Vite define replacement)
  if (typeof process !== 'undefined' && process.env) {
    url =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      '';
    key =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      '';
  }

  // 2. Vite import.meta.env fallback
  if (!url && typeof import.meta !== 'undefined' && import.meta.env) {
    url =
      import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
      import.meta.env.VITE_SUPABASE_URL ||
      '';
  }
  if (!key && typeof import.meta !== 'undefined' && import.meta.env) {
    key =
      import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      '';
  }

  // 3. User custom config saved in localStorage
  if ((!url || !key) && typeof window !== 'undefined' && window.localStorage) {
    try {
      if (!url) url = window.localStorage.getItem('vw_supabase_url') || '';
      if (!key) key = window.localStorage.getItem('vw_supabase_anon_key') || '';
    } catch {
      // ignore
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

/**
 * Global Supabase Client Singleton
 * Configured with session persistence and automatic token refresh for the active user.
 */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

/**
 * Creates an isolated Supabase client without session persistence.
 * Used when an Admin creates credentials for another member so that the Admin's
 * active session is NEVER hijacked, logged out, or overwritten.
 */
export const getIsolatedAuthClient = () => {
  if (!isSupabaseConfigured) {
    console.warn('⚠️ Cannot initialize isolated auth client: Supabase credentials missing.');
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: `vw_isolated_auth_${Date.now()}`,
    },
  });
};

if (!isSupabaseConfigured) {
  console.warn(
    '⚠️ Supabase credentials missing or unconfigured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). App operating in local storage mode without breaking user flows.'
  );
} else {
  console.info('🔌 Global Supabase client singleton successfully initialized:', supabaseUrl);
}

