-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/kmloseczqatswwczqajs/sql/new
CREATE TABLE IF NOT EXISTS mkt_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date text NOT NULL,
  tab text NOT NULL,
  name text NOT NULL,
  fb numeric DEFAULT 0,
  google numeric DEFAULT 0,
  tiktok numeric DEFAULT 0,
  register numeric DEFAULT 0,
  deposit_member numeric DEFAULT 0,
  first_deposit numeric DEFAULT 0,
  daily_deposit numeric DEFAULT 0,
  month_deposit numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(date, tab, name)
);

-- Enable RLS (allow anon read/write for this table)
ALTER TABLE mkt_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON mkt_data FOR ALL USING (true) WITH CHECK (true);
