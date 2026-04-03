import { createClient } from '@supabase/supabase-js';

// fallback hardcode กัน env หลุด
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kmloseczqatswwczqajs.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbG9zZWN6cWF0c3d3Y3pxYWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NjQyMzAsImV4cCI6MjA3NzM0MDIzMH0.tc3oZrRBDhbQXfwerLPjTbsNMDwSP0gHhhmd96bPd9I';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const isOnline = true;
