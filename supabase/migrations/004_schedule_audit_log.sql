-- Schedule audit log — tracks all schedule changes for accountability
CREATE TABLE schedule_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_entry_id uuid,
  action text NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  user_id uuid NOT NULL REFERENCES profiles(id),
  target_user_id uuid REFERENCES profiles(id),
  project_id uuid REFERENCES projects(id),
  date date,
  old_project_id uuid REFERENCES projects(id),
  changed_by uuid NOT NULL REFERENCES profiles(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

-- RLS: admins see all, field workers see entries about themselves
ALTER TABLE schedule_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all audit logs"
  ON schedule_audit_log FOR SELECT
  USING (get_user_role() = 'admin');

CREATE POLICY "Users can read audit logs about themselves"
  ON schedule_audit_log FOR SELECT
  USING (target_user_id = auth.uid());

-- Allow inserts from the trigger (runs as SECURITY DEFINER)
CREATE POLICY "System can insert audit logs"
  ON schedule_audit_log FOR INSERT
  WITH CHECK (true);

-- Trigger function to log schedule changes
CREATE OR REPLACE FUNCTION log_schedule_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO schedule_audit_log (schedule_entry_id, action, user_id, target_user_id, project_id, date, changed_by)
    VALUES (NEW.id, 'insert', NEW.user_id, NEW.user_id, NEW.project_id, NEW.date, NEW.created_by);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO schedule_audit_log (schedule_entry_id, action, user_id, target_user_id, project_id, date, old_project_id, changed_by)
    VALUES (NEW.id, 'update', NEW.user_id, NEW.user_id, NEW.project_id, NEW.date, OLD.project_id, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO schedule_audit_log (schedule_entry_id, action, user_id, target_user_id, project_id, date, changed_by)
    VALUES (OLD.id, 'delete', OLD.user_id, OLD.user_id, OLD.project_id, OLD.date, auth.uid());
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER schedule_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON schedule_entries
  FOR EACH ROW EXECUTE FUNCTION log_schedule_change();

-- Update schedule_entries RLS: field workers can now manage their own entries
CREATE POLICY "Users can insert own schedule entries"
  ON schedule_entries FOR INSERT
  WITH CHECK (user_id = auth.uid() OR get_user_role() = 'admin');

CREATE POLICY "Users can update own schedule entries"
  ON schedule_entries FOR UPDATE
  USING (user_id = auth.uid() OR get_user_role() = 'admin');

CREATE POLICY "Users can delete own schedule entries"
  ON schedule_entries FOR DELETE
  USING (user_id = auth.uid() OR get_user_role() = 'admin');

-- Allow all authenticated users to read schedule entries (already may exist, safe to add)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'schedule_entries' AND policyname = 'Anyone can read schedule entries'
  ) THEN
    CREATE POLICY "Anyone can read schedule entries"
      ON schedule_entries FOR SELECT
      USING (true);
  END IF;
END $$;
