-- ============================================================
-- Supabase Row Level Security (RLS) Policies
-- GlobalWork Pro — Security Hardening
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE compensation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()::text
    AND role = 'ADMIN'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- USERS: everyone reads, only self can update own row
-- ============================================================
CREATE POLICY "users_select_all" ON users
  FOR SELECT USING (true);

CREATE POLICY "users_update_self" ON users
  FOR UPDATE USING (id = auth.uid()::text);

CREATE POLICY "users_insert_admin" ON users
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "users_delete_admin" ON users
  FOR DELETE USING (is_admin());

-- ============================================================
-- ATTENDANCE: read/write only own records
-- ============================================================
CREATE POLICY "attendance_select_own" ON attendance_records
  FOR SELECT USING (user_id = auth.uid()::text OR is_admin());

CREATE POLICY "attendance_insert_own" ON attendance_records
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "attendance_update_own" ON attendance_records
  FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "attendance_delete_admin" ON attendance_records
  FOR DELETE USING (is_admin());

-- ============================================================
-- LEAVE RECORDS: own records + admin full access
-- ============================================================
CREATE POLICY "leave_select_own" ON leave_records
  FOR SELECT USING (employee_id = auth.uid()::text OR is_admin());

CREATE POLICY "leave_insert_own" ON leave_records
  FOR INSERT WITH CHECK (employee_id = auth.uid()::text);

CREATE POLICY "leave_update_admin" ON leave_records
  FOR UPDATE USING (is_admin());

CREATE POLICY "leave_delete_admin" ON leave_records
  FOR DELETE USING (is_admin());

-- ============================================================
-- ANNOUNCEMENTS: everyone reads, admin manages
-- ============================================================
CREATE POLICY "announcements_select_all" ON announcements
  FOR SELECT USING (true);

CREATE POLICY "announcements_insert_admin" ON announcements
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "announcements_update_admin" ON announcements
  FOR UPDATE USING (is_admin());

CREATE POLICY "announcements_delete_admin" ON announcements
  FOR DELETE USING (is_admin());

-- ============================================================
-- CONTENT PLANS: everyone reads, admin manages
-- ============================================================
CREATE POLICY "content_select_all" ON content_plans
  FOR SELECT USING (true);

CREATE POLICY "content_insert_admin" ON content_plans
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "content_update_admin" ON content_plans
  FOR UPDATE USING (is_admin());

CREATE POLICY "content_delete_admin" ON content_plans
  FOR DELETE USING (is_admin());

-- ============================================================
-- DAILY SUMMARIES: own records + admin
-- ============================================================
CREATE POLICY "summary_select_own" ON daily_summaries
  FOR SELECT USING (employee_id = auth.uid()::text OR is_admin());

CREATE POLICY "summary_insert_own" ON daily_summaries
  FOR INSERT WITH CHECK (employee_id = auth.uid()::text OR is_admin());

CREATE POLICY "summary_update_own" ON daily_summaries
  FOR UPDATE USING (employee_id = auth.uid()::text OR is_admin());

CREATE POLICY "summary_delete_admin" ON daily_summaries
  FOR DELETE USING (is_admin());

-- ============================================================
-- PAYROLL: admin only
-- ============================================================
CREATE POLICY "payroll_select_admin" ON payroll_records
  FOR SELECT USING (employee_id = auth.uid()::text OR is_admin());

CREATE POLICY "payroll_insert_admin" ON payroll_records
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "payroll_update_admin" ON payroll_records
  FOR UPDATE USING (is_admin());

CREATE POLICY "payroll_delete_admin" ON payroll_records
  FOR DELETE USING (is_admin());

-- ============================================================
-- COMPENSATION: admin only
-- ============================================================
CREATE POLICY "comp_select" ON compensation_settings
  FOR SELECT USING (employee_id = auth.uid()::text OR is_admin());

CREATE POLICY "comp_insert_admin" ON compensation_settings
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "comp_update_admin" ON compensation_settings
  FOR UPDATE USING (is_admin());

CREATE POLICY "comp_delete_admin" ON compensation_settings
  FOR DELETE USING (is_admin());

-- ============================================================
-- SYSTEM SETTINGS: admin only
-- ============================================================
CREATE POLICY "settings_select_all" ON system_settings
  FOR SELECT USING (true);

CREATE POLICY "settings_insert_admin" ON system_settings
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "settings_update_admin" ON system_settings
  FOR UPDATE USING (is_admin());

CREATE POLICY "settings_delete_admin" ON system_settings
  FOR DELETE USING (is_admin());

-- ============================================================
-- Migration: rename pin → pin_hash column
-- ============================================================
ALTER TABLE users RENAME COLUMN pin TO pin_hash;
