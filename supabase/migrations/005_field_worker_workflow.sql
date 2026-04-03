-- Migration: 005_field_worker_workflow.sql
-- Purpose: Enable field worker daily workflow
--   1. Allow authenticated users (not just admins) to insert tasks and phases
--   2. Relax schedule_entries unique constraint to allow multiple projects per day

-- 1. Tasks: allow any authenticated user to insert (was admin-only)
DROP POLICY IF EXISTS "Admins can insert tasks" ON tasks;
CREATE POLICY "Authenticated users can insert tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Phases: allow any authenticated user to insert (was admin-only)
DROP POLICY IF EXISTS "Admins can insert phases" ON phases;
CREATE POLICY "Authenticated users can insert phases"
  ON phases FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Schedule entries: allow multiple projects per worker per day
--    Old: UNIQUE(user_id, date) — only one project per day
--    New: UNIQUE(user_id, project_id, date) — one entry per project per day
ALTER TABLE schedule_entries DROP CONSTRAINT schedule_entries_user_id_date_key;
ALTER TABLE schedule_entries ADD CONSTRAINT schedule_entries_user_project_date_key
  UNIQUE(user_id, project_id, date);
