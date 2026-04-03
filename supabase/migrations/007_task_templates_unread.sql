-- Migration: 007_task_templates_unread.sql
-- Purpose: Template tasks + project unread tracking

-- 1. Template tasks — tasks that auto-populate when creating projects from templates
CREATE TABLE template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_phase_id UUID NOT NULL REFERENCES template_phases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE template_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read template tasks"
  ON template_tasks FOR SELECT USING (true);

CREATE POLICY "Admins can insert template tasks"
  ON template_tasks FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update template tasks"
  ON template_tasks FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can delete template tasks"
  ON template_tasks FOR DELETE
  USING (get_user_role() = 'admin');

CREATE INDEX idx_template_tasks_phase ON template_tasks(template_phase_id);

-- 2. Project views — tracks when admin last viewed a project (for unread dots)
CREATE TABLE project_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, project_id)
);

ALTER TABLE project_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own views"
  ON project_views FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own views"
  ON project_views FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own views"
  ON project_views FOR UPDATE
  USING (user_id = auth.uid());

CREATE INDEX idx_project_views_user ON project_views(user_id);
