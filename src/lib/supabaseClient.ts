import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Initialize Supabase client with security hardening
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // Critical for handling the callback
    flowType: 'pkce', // Most secure flow type
    storage: window.localStorage,
    storageKey: 'sb-auth-token',
  },
});
