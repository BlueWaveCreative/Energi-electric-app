-- Migration: 010_materials_quotes.sql
-- Purpose: Materials database + Quotes (Milestone 3)
-- PRD: docs/PRD.md §"Materials & Pricing Database (P0) — INTERNAL ONLY"
-- Source data: docs/joe-materials-prototype.tsx

-- ============================================================
-- 1. Material categories ("phases" in Joe's prototype)
-- ============================================================
CREATE TABLE material_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE material_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage categories"
  ON material_categories FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Field workers can read categories"
  ON material_categories FOR SELECT
  USING (get_user_role() = 'field_worker');

INSERT INTO material_categories (name, sort_order) VALUES
  ('Rough-In',        1),
  ('Trim-Out',        2),
  ('Service/Panel',   3),
  ('Temporary Power', 4),
  ('Misc/Other',      5);

-- ============================================================
-- 2. Materials master
-- ============================================================
CREATE TABLE materials (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  unit         TEXT NOT NULL CHECK (unit IN ('ft', 'ea', 'box', 'bag', 'set')),
  price        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  category_id  UUID NOT NULL REFERENCES material_categories(id) ON DELETE RESTRICT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage materials"
  ON materials FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Field workers can read materials"
  ON materials FOR SELECT
  USING (get_user_role() = 'field_worker');

CREATE INDEX idx_materials_category ON materials(category_id);
CREATE INDEX idx_materials_active   ON materials(active);

-- Seed: 59 default materials from Joe's prototype.
-- Sort order within each category preserves prototype ordering.
DO $$
DECLARE
  cat_rough_in    UUID := (SELECT id FROM material_categories WHERE name = 'Rough-In');
  cat_trim_out    UUID := (SELECT id FROM material_categories WHERE name = 'Trim-Out');
  cat_service     UUID := (SELECT id FROM material_categories WHERE name = 'Service/Panel');
  cat_temp_power  UUID := (SELECT id FROM material_categories WHERE name = 'Temporary Power');
  cat_misc        UUID := (SELECT id FROM material_categories WHERE name = 'Misc/Other');
BEGIN
  -- Rough-In
  INSERT INTO materials (name, unit, price, category_id, sort_order) VALUES
    ('12/2 NM-B Wire',                'ft',  0.65, cat_rough_in,  1),
    ('14/2 NM-B Wire',                'ft',  0.45, cat_rough_in,  2),
    ('10/2 NM-B Wire',                'ft',  1.10, cat_rough_in,  3),
    ('12/3 NM-B Wire',                'ft',  0.95, cat_rough_in,  4),
    ('Single Gang Box (Plastic)',     'ea',  0.75, cat_rough_in,  5),
    ('Double Gang Box (Plastic)',     'ea',  1.25, cat_rough_in,  6),
    ('4" Square Box',                 'ea',  2.50, cat_rough_in,  7),
    ('1/2" Romex Staples (box)',      'box', 4.50, cat_rough_in,  8),
    ('1/2" EMT Conduit (10ft)',       'ea',  4.25, cat_rough_in,  9),
    ('3/4" EMT Conduit (10ft)',       'ea',  6.50, cat_rough_in, 10),
    ('1/2" EMT Connector',            'ea',  0.85, cat_rough_in, 11),
    ('1/2" EMT Coupling',             'ea',  0.65, cat_rough_in, 12),
    ('Low Voltage Bracket',           'ea',  1.20, cat_rough_in, 13),
    ('Old Work Box',                  'ea',  2.10, cat_rough_in, 14);

  -- Trim-Out
  INSERT INTO materials (name, unit, price, category_id, sort_order) VALUES
    ('15A Duplex Receptacle',         'ea',  1.85, cat_trim_out,  1),
    ('20A Duplex Receptacle',         'ea',  3.25, cat_trim_out,  2),
    ('GFCI Receptacle 15A',           'ea', 14.50, cat_trim_out,  3),
    ('GFCI Receptacle 20A',           'ea', 17.00, cat_trim_out,  4),
    ('AFCI Receptacle',               'ea', 28.00, cat_trim_out,  5),
    ('Single Pole Switch 15A',        'ea',  2.50, cat_trim_out,  6),
    ('3-Way Switch',                  'ea',  5.75, cat_trim_out,  7),
    ('Dimmer Switch (Single Pole)',   'ea', 18.00, cat_trim_out,  8),
    ('Decora Cover Plate',            'ea',  0.95, cat_trim_out,  9),
    ('Standard Cover Plate',          'ea',  0.55, cat_trim_out, 10),
    ('Smoke Detector (AC)',           'ea', 22.00, cat_trim_out, 11),
    ('Combo Smoke/CO Detector',       'ea', 38.00, cat_trim_out, 12),
    ('Wire Connector (bag/100)',      'bag', 8.50, cat_trim_out, 13);

  -- Service/Panel
  INSERT INTO materials (name, unit, price, category_id, sort_order) VALUES
    ('200A Main Breaker Panel',       'ea', 185.00, cat_service,  1),
    ('100A Main Breaker Panel',       'ea',  95.00, cat_service,  2),
    ('Single Pole Breaker 15A',       'ea',   8.50, cat_service,  3),
    ('Single Pole Breaker 20A',       'ea',   8.50, cat_service,  4),
    ('Double Pole Breaker 30A',       'ea',  14.00, cat_service,  5),
    ('Double Pole Breaker 50A',       'ea',  18.00, cat_service,  6),
    ('AFCI Breaker 15A',              'ea',  42.00, cat_service,  7),
    ('AFCI Breaker 20A',              'ea',  42.00, cat_service,  8),
    ('GFCI Breaker 20A',              'ea',  48.00, cat_service,  9),
    ('2/0 Aluminum Service Wire (ft)','ft',   2.85, cat_service, 10),
    ('200A Meter Socket',             'ea',  68.00, cat_service, 11),
    ('Ground Rod (8ft)',              'ea',  12.50, cat_service, 12),
    ('Ground Rod Clamp',              'ea',   3.25, cat_service, 13),
    ('2" PVC Conduit (10ft)',         'ea',   9.50, cat_service, 14),
    ('2" PVC LB',                     'ea',   8.75, cat_service, 15);

  -- Temporary Power
  INSERT INTO materials (name, unit, price, category_id, sort_order) VALUES
    ('Temp Power Pole',               'ea',  45.00, cat_temp_power, 1),
    ('Spider Box (6-circuit)',        'ea', 185.00, cat_temp_power, 2),
    ('50A Male Plug',                 'ea',  18.00, cat_temp_power, 3),
    ('30A Receptacle',                'ea',  12.00, cat_temp_power, 4),
    ('GFCI Inline Cord',              'ea',  22.00, cat_temp_power, 5),
    ('10/3 SO Cord (ft)',             'ft',   2.10, cat_temp_power, 6),
    ('Extension Cord 100ft 12g',      'ea',  38.00, cat_temp_power, 7);

  -- Misc/Other
  INSERT INTO materials (name, unit, price, category_id, sort_order) VALUES
    ('Electrical Tape (roll)',        'ea',  1.85, cat_misc, 1),
    ('Pull String (500ft)',           'ea', 12.00, cat_misc, 2),
    ('Liquid Tight Connector 1/2"',   'ea',  2.25, cat_misc, 3),
    ('Weatherproof Cover (1g)',       'ea',  4.50, cat_misc, 4),
    ('Weatherproof Cover (2g)',       'ea',  6.75, cat_misc, 5),
    ('Conduit Strap 1/2" (bag/10)',   'bag', 3.50, cat_misc, 6),
    ('Knockouts (assorted)',          'set', 5.00, cat_misc, 7),
    ('Anti-Short Bushings (bag)',     'bag', 2.75, cat_misc, 8),
    ('Cable Ties (bag/100)',          'bag', 4.00, cat_misc, 9),
    ('Label Tape',                    'ea',  8.50, cat_misc, 10);
END $$;

-- ============================================================
-- 3. Quotes
-- ============================================================
CREATE SEQUENCE quote_number_seq START WITH 1001 INCREMENT BY 1;

CREATE TABLE quotes (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number             INTEGER NOT NULL UNIQUE DEFAULT nextval('quote_number_seq'),
  customer_id              UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  project_id               UUID REFERENCES projects(id) ON DELETE SET NULL,
  title                    TEXT NOT NULL,
  -- Free-text description used as the customer-facing summary on the converted invoice:
  -- "Provided material and labor for [description]"
  description              TEXT NOT NULL DEFAULT '',
  job_type                 TEXT NOT NULL CHECK (job_type IN ('rough_in', 'trim_out', 'service')),
  status                   TEXT NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired', 'converted')),
  -- Pricing knobs (defaults match Joe's prototype)
  markup_enabled           BOOLEAN NOT NULL DEFAULT true,
  markup_percent           NUMERIC(5,2) NOT NULL DEFAULT 20.00 CHECK (markup_percent >= 0),
  tax_enabled              BOOLEAN NOT NULL DEFAULT true,
  tax_percent              NUMERIC(5,2) NOT NULL DEFAULT 8.50 CHECK (tax_percent >= 0),
  labor_rate               NUMERIC(10,2) NOT NULL DEFAULT 85.00 CHECK (labor_rate >= 0),
  labor_hours              NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (labor_hours >= 0),
  flat_fee_enabled         BOOLEAN NOT NULL DEFAULT false,
  flat_fee                 NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (flat_fee >= 0),
  -- Lifecycle
  issued_date              DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until              DATE,
  sent_at                  TIMESTAMPTZ,
  converted_at             TIMESTAMPTZ,
  converted_to_invoice_id  UUID REFERENCES invoices(id) ON DELETE SET NULL,
  notes                    TEXT,
  created_by               UUID NOT NULL REFERENCES profiles(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage quotes"
  ON quotes FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE INDEX idx_quotes_customer ON quotes(customer_id);
CREATE INDEX idx_quotes_project  ON quotes(project_id);
CREATE INDEX idx_quotes_status   ON quotes(status);
CREATE INDEX idx_quotes_invoice  ON quotes(converted_to_invoice_id);

-- ============================================================
-- 4. Quote line items (snapshotted from materials)
-- ============================================================
CREATE TABLE quote_line_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id       UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  -- Nullable so deleting a material doesn't orphan history; snapshot fields remain authoritative.
  material_id    UUID REFERENCES materials(id) ON DELETE SET NULL,
  -- Snapshot fields — authoritative once written.
  material_name  TEXT NOT NULL,
  unit           TEXT NOT NULL,
  unit_price     NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  quantity       NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  -- Phase snapshot (for grouping in UI / printout)
  phase          TEXT NOT NULL,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage quote line items"
  ON quote_line_items FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE INDEX idx_quote_lines_quote    ON quote_line_items(quote_id);
CREATE INDEX idx_quote_lines_material ON quote_line_items(material_id);

-- ============================================================
-- 5. updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
