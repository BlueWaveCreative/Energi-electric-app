-- 1. Harden handle_new_user trigger: always assign field_worker
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'field_worker'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix profile self-update: prevent role/status self-modification
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own name"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    role = (SELECT role FROM profiles WHERE id = auth.uid())
    AND status = (SELECT status FROM profiles WHERE id = auth.uid())
  );

-- 3. Restrict task updates for non-admins to status only
DROP POLICY IF EXISTS "Anyone can update tasks" ON tasks;
CREATE POLICY "Anyone can update task status"
  ON tasks FOR UPDATE
  USING (true)
  WITH CHECK (
    get_user_role() = 'admin'
    OR (
      title = (SELECT title FROM tasks t WHERE t.id = tasks.id)
      AND description IS NOT DISTINCT FROM (SELECT description FROM tasks t WHERE t.id = tasks.id)
      AND due_date IS NOT DISTINCT FROM (SELECT due_date FROM tasks t WHERE t.id = tasks.id)
      AND assigned_to IS NOT DISTINCT FROM (SELECT assigned_to FROM tasks t WHERE t.id = tasks.id)
    )
  );
