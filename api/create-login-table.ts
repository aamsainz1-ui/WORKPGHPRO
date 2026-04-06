import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = 'https://kmloseczqatswwczqajs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbG9zZWN6cWF0c3d3Y3pxYWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NjQyMzAsImV4cCI6MjA3NzM0MDIzMH0.tc3oZrRBDhbQXfwerLPjTbsNMDwSP0gHhhmd96bPd9I';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  // This uses the Supabase SQL API via the anon key
  // Table must be created via Supabase Dashboard SQL Editor:
  //
  // CREATE TABLE IF NOT EXISTS login_logs (
  //   id bigint generated always as identity primary key,
  //   user_id text,
  //   user_name text,
  //   role text,
  //   logged_in_at timestamptz default now(),
  //   device text
  // );
  // ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;
  // CREATE POLICY "Allow anon insert" ON login_logs FOR INSERT WITH CHECK (true);
  // CREATE POLICY "Allow anon select" ON login_logs FOR SELECT USING (true);

  res.status(200).json({
    message: 'Please create the login_logs table via Supabase Dashboard SQL Editor using the SQL above.',
    sql: `CREATE TABLE IF NOT EXISTS login_logs (
  id bigint generated always as identity primary key,
  user_id text,
  user_name text,
  role text,
  logged_in_at timestamptz default now(),
  device text
);
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert" ON login_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon select" ON login_logs FOR SELECT USING (true);`
  });
}
