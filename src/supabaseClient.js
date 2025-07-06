import { createClient } from '@supabase/supabase-js';

// Use environment variables for production
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vnvxddckptkjwojhvkzf.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZudnhkZGNrcHRrandvamh2a3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNzY3OTgsIm86400V4cCI6MjA2Njk1Mjc5OH0.LenDwXdT6y2pkLcel4fTAn_uKdR9v-SGsdpk19fCi9E';

// Validate environment variables
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  throw new Error('Missing Supabase configuration');
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Test connection
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('Supabase connection error:', error);
  } else {
    console.log('Supabase connected successfully');
  }
});
