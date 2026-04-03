-- Migration: 006_customers.sql
-- Purpose: Add customers table and link to projects

-- 1. Create customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Anyone can read customers (field workers see customer info on Today screen)
CREATE POLICY "Anyone can read customers"
  ON customers FOR SELECT USING (true);

-- Admins can manage customers
CREATE POLICY "Admins can insert customers"
  ON customers FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update customers"
  ON customers FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can delete customers"
  ON customers FOR DELETE
  USING (get_user_role() = 'admin');

-- 2. Add customer_id to projects (nullable — existing projects have no customer)
ALTER TABLE projects ADD COLUMN customer_id UUID REFERENCES customers(id);
CREATE INDEX idx_projects_customer ON projects(customer_id);
