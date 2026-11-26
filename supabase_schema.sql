-- ==============================================================================
-- VESSEL WASH APPLICATION - SUPABASE DATABASE SCHEMA
-- Tables: members, application_settings, attendance_history, washer_activity
-- ==============================================================================

-- 1. MEMBERS TABLE
-- Holds team members, their codes, active status, and rotation order in the queue
CREATE TABLE IF NOT EXISTS public.members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    rotation_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. APPLICATION_SETTINGS TABLE
-- Stores parsed Excel timetable rules, initial queue, and system configuration as JSON
CREATE TABLE IF NOT EXISTS public.application_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ATTENDANCE_HISTORY TABLE
-- Stores daily meal attendance (eaters list), meal availability, and washer count
CREATE TABLE IF NOT EXISTS public.attendance_history (
    id TEXT PRIMARY KEY, -- e.g. '2026-09-21-lunch'
    date TEXT NOT NULL,  -- e.g. '2026-09-21'
    meal TEXT NOT NULL,  -- 'lunch' | 'dinner'
    is_provided BOOLEAN NOT NULL DEFAULT FALSE,
    eaters JSONB NOT NULL DEFAULT '[]'::jsonb,
    washers_count INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. WASHER_ACTIVITY TABLE
-- Stores calculated Today's Washer(s) and Next Washer assignments for each meal
CREATE TABLE IF NOT EXISTS public.washer_activity (
    id TEXT PRIMARY KEY, -- e.g. '2026-09-21-lunch'
    date TEXT NOT NULL,
    meal TEXT NOT NULL,
    assigned_washer_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    assigned_washer_names JSONB NOT NULL DEFAULT '[]'::jsonb,
    next_washer_id TEXT,
    next_washer_name TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ENABLE REALTIME REPLICATION (SAFE & IDEMPOTENT)
-- Adds tables to the supabase_realtime publication for instant cross-device updates
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'application_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.application_settings;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'attendance_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_history;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'washer_activity'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.washer_activity;
  END IF;
END $$;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES (SAFE & IDEMPOTENT)
-- Authenticated users (M1–M6+ and Admins) have full SELECT read access to wash history
-- ==============================================================================
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washer_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous read access on members" ON public.members;
DROP POLICY IF EXISTS "Allow anonymous write access on members" ON public.members;
CREATE POLICY "Allow anonymous read access on members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Allow anonymous write access on members" ON public.members FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anonymous read access on application_settings" ON public.application_settings;
DROP POLICY IF EXISTS "Allow anonymous write access on application_settings" ON public.application_settings;
CREATE POLICY "Allow anonymous read access on application_settings" ON public.application_settings FOR SELECT USING (true);
CREATE POLICY "Allow anonymous write access on application_settings" ON public.application_settings FOR ALL USING (true);

-- 1. ATTENDANCE_HISTORY RLS POLICIES (Full read access for all authenticated members)
DROP POLICY IF EXISTS "Allow authenticated read access on attendance_history" ON public.attendance_history;
CREATE POLICY "Allow authenticated read access on attendance_history" 
  ON public.attendance_history 
  FOR SELECT 
  TO authenticated 
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow anonymous read access on attendance_history" ON public.attendance_history;
CREATE POLICY "Allow anonymous read access on attendance_history" 
  ON public.attendance_history 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Allow anonymous write access on attendance_history" ON public.attendance_history;
CREATE POLICY "Allow anonymous write access on attendance_history" 
  ON public.attendance_history 
  FOR ALL 
  USING (true);

-- 2. WASHER_ACTIVITY RLS POLICIES (Full read access for all authenticated members)
DROP POLICY IF EXISTS "Allow authenticated read access on washer_activity" ON public.washer_activity;
CREATE POLICY "Allow authenticated read access on washer_activity" 
  ON public.washer_activity 
  FOR SELECT 
  TO authenticated 
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow anonymous read access on washer_activity" ON public.washer_activity;
CREATE POLICY "Allow anonymous read access on washer_activity" 
  ON public.washer_activity 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Allow anonymous write access on washer_activity" ON public.washer_activity;
CREATE POLICY "Allow anonymous write access on washer_activity" 
  ON public.washer_activity 
  FOR ALL 
  USING (true);

-- 3. WASH_HISTORY TABLE (DEDICATED WASH LOGS - FULL AUTHENTICATED READ ACCESS)
CREATE TABLE IF NOT EXISTS public.wash_history (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    meal TEXT NOT NULL,
    slot_index INTEGER DEFAULT 1,
    member_id TEXT NOT NULL,
    member_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'present',
    marked_at TIMESTAMPTZ DEFAULT NOW(),
    marked_by TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wash_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read access on wash_history" ON public.wash_history;
CREATE POLICY "Allow authenticated read access on wash_history" 
  ON public.wash_history 
  FOR SELECT 
  TO authenticated 
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow anonymous read access on wash_history" ON public.wash_history;
CREATE POLICY "Allow anonymous read access on wash_history" 
  ON public.wash_history 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Allow write access on wash_history" ON public.wash_history;
CREATE POLICY "Allow write access on wash_history" 
  ON public.wash_history 
  FOR ALL 
  USING (true);
