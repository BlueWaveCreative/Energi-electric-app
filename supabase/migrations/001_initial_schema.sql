-- Enums
CREATE TYPE user_role AS ENUM ('admin', 'field_worker');
CREATE TYPE user_status AS ENUM ('active', 'inactive');
CREATE TYPE project_status AS ENUM ('active', 'completed', 'archived');
CREATE TYPE phase_status AS ENUM ('not_started', 'in_progress', 'complete');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'complete');
CREATE TYPE time_entry_method AS ENUM ('clock', 'manual');
CREATE TYPE linkable_type AS ENUM ('project', 'phase', 'task');

-- Users (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'field_worker',
  status user_status NOT NULL DEFAULT 'active',
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project Templates
CREATE TABLE project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Template Phases
CREATE TABLE template_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  status project_status NOT NULL DEFAULT 'active',
  template_id UUID REFERENCES project_templates(id),
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project Phases
CREATE TABLE phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status phase_status NOT NULL DEFAULT 'not_started',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks (within phases)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'pending',
  due_date DATE,
  assigned_to UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Time Entries
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES phases(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  method time_entry_method NOT NULL DEFAULT 'clock',
  admin_edited BOOLEAN NOT NULL DEFAULT false,
  edited_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notes
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  linked_type linkable_type NOT NULL,
  linked_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Photos
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  caption TEXT,
  linked_type linkable_type NOT NULL,
  linked_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Plans (blueprints)
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Annotations (on plans)
CREATE TABLE annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  canvas_data JSONB NOT NULL DEFAULT '{}',
  layer_name TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_phases_project ON phases(project_id);
CREATE INDEX idx_tasks_phase ON tasks(phase_id);
CREATE INDEX idx_time_entries_project ON time_entries(project_id);
CREATE INDEX idx_time_entries_user ON time_entries(user_id);
CREATE INDEX idx_notes_linked ON notes(linked_type, linked_id);
CREATE INDEX idx_photos_linked ON photos(linked_type, linked_id);
CREATE INDEX idx_plans_project ON plans(project_id);
CREATE INDEX idx_annotations_plan ON annotations(plan_id);
CREATE INDEX idx_template_phases_template ON template_phases(template_id);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS Policies

-- Profiles: everyone can read active profiles, admins can update
CREATE POLICY "Anyone can read active profiles"
  ON profiles FOR SELECT
  USING (status = 'active' OR id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (get_user_role() = 'admin' OR id = auth.uid());

-- Project Templates: everyone reads, admins write
CREATE POLICY "Anyone can read templates"
  ON project_templates FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage templates"
  ON project_templates FOR ALL
  USING (get_user_role() = 'admin');

-- Template Phases: follow template access
CREATE POLICY "Anyone can read template phases"
  ON template_phases FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage template phases"
  ON template_phases FOR ALL
  USING (get_user_role() = 'admin');

-- Projects: all active users can read, admins can create/edit
CREATE POLICY "Active users can read projects"
  ON projects FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage projects"
  ON projects FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update projects"
  ON projects FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can delete projects"
  ON projects FOR DELETE
  USING (get_user_role() = 'admin');

-- Phases: all can read, admins can manage
CREATE POLICY "Anyone can read phases"
  ON phases FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage phases"
  ON phases FOR ALL
  USING (get_user_role() = 'admin');

-- Tasks: all can read and update status, admins can create/delete
CREATE POLICY "Anyone can read tasks"
  ON tasks FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update tasks"
  ON tasks FOR UPDATE
  USING (true);

CREATE POLICY "Admins can insert tasks"
  ON tasks FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can delete tasks"
  ON tasks FOR DELETE
  USING (get_user_role() = 'admin');

-- Time entries: users see all, manage their own, admins can edit any
CREATE POLICY "Anyone can read time entries"
  ON time_entries FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own time entries"
  ON time_entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own time entries"
  ON time_entries FOR UPDATE
  USING (user_id = auth.uid() OR get_user_role() = 'admin');

CREATE POLICY "Admins can delete time entries"
  ON time_entries FOR DELETE
  USING (get_user_role() = 'admin');

-- Notes: users see all, manage their own
CREATE POLICY "Anyone can read notes"
  ON notes FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own notes"
  ON notes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can delete notes"
  ON notes FOR DELETE
  USING (get_user_role() = 'admin');

-- Photos: same as notes
CREATE POLICY "Anyone can read photos"
  ON photos FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own photos"
  ON photos FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can delete photos"
  ON photos FOR DELETE
  USING (get_user_role() = 'admin');

-- Plans: all can read, admins can manage
CREATE POLICY "Anyone can read plans"
  ON plans FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage plans"
  ON plans FOR ALL
  USING (get_user_role() = 'admin');

-- Annotations: all can read and create, users update their own
CREATE POLICY "Anyone can read annotations"
  ON annotations FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert annotations"
  ON annotations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own annotations"
  ON annotations FOR UPDATE
  USING (user_id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'field_worker')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Storage bucket for photos and plans
INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', false);

CREATE POLICY "Authenticated users can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'project-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-files' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can delete files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'project-files' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
