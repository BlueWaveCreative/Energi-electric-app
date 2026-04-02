-- Expenses / Material Tracking
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'materials',
  receipt_path TEXT,
  receipt_thumbnail TEXT,
  expense_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_project ON expenses(project_id);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read expenses" ON expenses FOR SELECT USING (true);
CREATE POLICY "Users can insert own expenses" ON expenses FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can update expenses" ON expenses FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "Admins can delete expenses" ON expenses FOR DELETE USING (get_user_role() = 'admin');

-- Schedule Entries
CREATE TABLE schedule_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_schedule_user_date ON schedule_entries(user_id, date);
CREATE INDEX idx_schedule_date ON schedule_entries(date);

ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read schedule" ON schedule_entries FOR SELECT USING (true);
CREATE POLICY "Admins can insert schedule" ON schedule_entries FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "Admins can update schedule" ON schedule_entries FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "Admins can delete schedule" ON schedule_entries FOR DELETE USING (get_user_role() = 'admin');

-- Notification Preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) UNIQUE,
  clock_events BOOLEAN NOT NULL DEFAULT true,
  phase_complete BOOLEAN NOT NULL DEFAULT true,
  new_photo BOOLEAN NOT NULL DEFAULT true,
  push_subscription JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences" ON notification_preferences FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own preferences" ON notification_preferences FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own preferences" ON notification_preferences FOR UPDATE USING (user_id = auth.uid());

-- Inspections / Permits
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_date DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inspections_project ON inspections(project_id);

ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read inspections" ON inspections FOR SELECT USING (true);
CREATE POLICY "Admins can insert inspections" ON inspections FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "Admins can update inspections" ON inspections FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "Admins can delete inspections" ON inspections FOR DELETE USING (get_user_role() = 'admin');
