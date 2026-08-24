-- ============================================================================
-- ERRS Department Management System — PostgreSQL schema
--
-- See README.md for the full design rationale. Two decisions drive most of
-- this file:
--
-- 1. A UNIFIED case_documents table covers every License / Clearance /
--    Certificate / Bill across all four units, instead of a separate table
--    per document type (the source Excel data scattered this same shape
--    across 8+ tabs by document type and by major client — this fixes that).
--    document_types describes each KIND of document (label, owning unit,
--    numbering format); case_documents is one instance for one company.
--
-- 2. companies and chemicals are CONTROLLED master lists, not free text —
--    the source spreadsheet had the same chemical spelled 4+ ways and the
--    same company spelled inconsistently across tabs.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE unit_key AS ENUM ('CHEMICAL', 'ENV_MONITORING', 'RADIATION', 'WASTE');
CREATE TYPE user_role AS ENUM ('DEPT_HEAD', 'UNIT_HEAD', 'STAFF', 'INTERN');
CREATE TYPE chemical_category AS ENUM ('INDUSTRIAL', 'AGROCHEMICAL', 'EXPLOSIVE', 'MINING_REAGENT', 'OTHER');
CREATE TYPE document_kind AS ENUM ('LICENSE', 'CLEARANCE', 'CERTIFICATE', 'BILL');
CREATE TYPE validity_period AS ENUM ('CALENDAR_YEAR', 'ONE_YEAR_FROM_ISSUE', 'NONE');
CREATE TYPE case_status AS ENUM ('APPLICATION_RECEIVED', 'RESPONDED', 'AWAITING_PAYMENT', 'PAID', 'ISSUED', 'EXPIRED', 'REJECTED');
CREATE TYPE inspection_outcome AS ENUM ('COMPLIANT', 'NON_COMPLIANT', 'PENDING_REVIEW');
CREATE TYPE complaint_type AS ENUM ('NOISE', 'WATER', 'AIR', 'WASTE', 'OTHER');
CREATE TYPE complaint_status AS ENUM ('RECEIVED', 'INVESTIGATING', 'FINDINGS_PRESENTED', 'CLOSED');
CREATE TYPE medium AS ENUM ('WATER', 'SOIL', 'AIR');
CREATE TYPE timeliness AS ENUM ('T', 'L', 'NR');
CREATE TYPE facility_type AS ENUM ('MEDICAL', 'INDUSTRIAL', 'ENVIRONMENTAL');
CREATE TYPE training_category AS ENUM ('EXTERNAL', 'INTERNAL');
CREATE TYPE reminder_status AS ENUM ('SCHEDULED', 'SENT', 'ACKNOWLEDGED');
CREATE TYPE asset_category AS ENUM ('VEHICLE', 'LAPTOP', 'LAB_INSTRUMENT', 'RADIATION_DETECTOR', 'OTHER');
CREATE TYPE asset_status AS ENUM ('OPERATIONAL', 'NEEDS_CALIBRATION', 'OUT_OF_SERVICE');
CREATE TYPE activity_type AS ENUM ('FOREIGN_EVENT', 'LOCAL_EVENT', 'MEETING', 'TRAINING', 'OTHER');

-- ---------------------------------------------------------------------------
-- Org structure, users
-- ---------------------------------------------------------------------------

CREATE TABLE units (
  id           SERIAL PRIMARY KEY,
  key          unit_key UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  alias_names  TEXT[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  username       TEXT UNIQUE NOT NULL,
  email          TEXT UNIQUE,
  password_hash  TEXT NOT NULL,
  role           user_role NOT NULL,
  unit_id        INTEGER REFERENCES units(id),
  active         BOOLEAN NOT NULL DEFAULT true,
  intern_ends_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Controlled master data
-- ---------------------------------------------------------------------------

CREATE TABLE companies (
  id             SERIAL PRIMARY KEY,
  name           TEXT UNIQUE NOT NULL,
  county         TEXT,
  community      TEXT,
  street_address TEXT,
  contact_name   TEXT,
  contact_phone  TEXT,
  contact_email  TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chemicals (
  id           SERIAL PRIMARY KEY,
  name         TEXT UNIQUE NOT NULL,
  aliases      TEXT[] NOT NULL DEFAULT '{}',
  category     chemical_category NOT NULL DEFAULT 'OTHER',
  default_unit TEXT NOT NULL DEFAULT 'kg',
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Unified License / Clearance / Certificate / Bill engine
-- ---------------------------------------------------------------------------

CREATE TABLE document_types (
  id             SERIAL PRIMARY KEY,
  unit_id        INTEGER NOT NULL REFERENCES units(id),
  key            TEXT UNIQUE NOT NULL,
  label          TEXT NOT NULL,
  kind           document_kind NOT NULL,
  number_prefix  TEXT NOT NULL DEFAULT '',
  number_suffix  TEXT NOT NULL DEFAULT '',
  number_padding INTEGER NOT NULL DEFAULT 3,
  block_size     INTEGER NOT NULL DEFAULT 180,
  validity       validity_period NOT NULL DEFAULT 'NONE',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE number_allocators (
  id               SERIAL PRIMARY KEY,
  document_type_id INTEGER NOT NULL REFERENCES document_types(id),
  year             INTEGER NOT NULL,
  next_seq         INTEGER NOT NULL DEFAULT 1,
  UNIQUE (document_type_id, year)
);

CREATE TABLE case_documents (
  id               SERIAL PRIMARY KEY,
  document_type_id INTEGER NOT NULL REFERENCES document_types(id),
  unit_id          INTEGER NOT NULL REFERENCES units(id),
  company_id       INTEGER NOT NULL REFERENCES companies(id),
  chemical_id      INTEGER REFERENCES chemicals(id),

  activity         TEXT,
  quantity         DOUBLE PRECISION,
  quantity_unit    TEXT,

  application_date DATE,
  response_date    DATE,
  reference_code   TEXT,
  amount_paid      DOUBLE PRECISION,
  receipt_number   TEXT,
  document_number  TEXT UNIQUE,
  date_issued      DATE,
  expiry_date      DATE,
  status           case_status NOT NULL DEFAULT 'APPLICATION_RECEIVED',
  notes            TEXT,

  created_by_id    INTEGER REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Chemical Unit specific
-- ---------------------------------------------------------------------------

CREATE TABLE chemical_escorts (
  id              SERIAL PRIMARY KEY,
  unit_id         INTEGER NOT NULL REFERENCES units(id),
  company_id      INTEGER REFERENCES companies(id),
  chemical_id     INTEGER REFERENCES chemicals(id),
  convoy_count    INTEGER NOT NULL DEFAULT 1,
  container_count INTEGER,
  escort_date     DATE NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chemical_inventory_audits (
  id            SERIAL PRIMARY KEY,
  unit_id       INTEGER NOT NULL REFERENCES units(id),
  facility_name TEXT NOT NULL,
  location      TEXT,
  audit_date    DATE NOT NULL,
  findings      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Environmental Monitoring & Research Unit specific
-- ---------------------------------------------------------------------------

CREATE TABLE site_inspections (
  id               SERIAL PRIMARY KEY,
  unit_id          INTEGER NOT NULL REFERENCES units(id),
  facility_name    TEXT NOT NULL,
  facility_type    TEXT,
  location         TEXT,
  inspection_date  DATE NOT NULL,
  outcome          inspection_outcome NOT NULL DEFAULT 'PENDING_REVIEW',
  findings         TEXT,
  action_taken     TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE complaints (
  id                 SERIAL PRIMARY KEY,
  unit_id            INTEGER NOT NULL REFERENCES units(id),
  type               complaint_type NOT NULL,
  complainant_name   TEXT,
  accused_party      TEXT NOT NULL,
  location           TEXT,
  description        TEXT,
  status             complaint_status NOT NULL DEFAULT 'RECEIVED',
  date_received      DATE NOT NULL,
  investigation_date DATE,
  findings           TEXT,
  closed_at          TIMESTAMPTZ,
  created_by_id      INTEGER REFERENCES users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lab_results (
  id             SERIAL PRIMARY KEY,
  unit_id        INTEGER NOT NULL REFERENCES units(id),
  company_id     INTEGER NOT NULL REFERENCES companies(id),
  medium         medium NOT NULL,
  parameter      TEXT NOT NULL,
  value          DOUBLE PRECISION NOT NULL,
  unit_of_measure TEXT,
  threshold_min  DOUBLE PRECISION,
  threshold_max  DOUBLE PRECISION,
  within_range   BOOLEAN,
  sampled_at     DATE NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reporting_quality_entries (
  id                          SERIAL PRIMARY KEY,
  unit_id                     INTEGER NOT NULL REFERENCES units(id),
  company_id                  INTEGER NOT NULL REFERENCES companies(id),
  medium                      medium NOT NULL,
  month                       INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year                        INTEGER NOT NULL,
  timeliness                  timeliness NOT NULL,
  completeness_pct            DOUBLE PRECISION,
  cumulative_timeliness_pct   DOUBLE PRECISION,
  cumulative_completeness_pct DOUBLE PRECISION,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, medium, month, year)
);

-- ---------------------------------------------------------------------------
-- Radiation Safety Unit specific
-- ---------------------------------------------------------------------------

CREATE TABLE radiation_inventories (
  id              SERIAL PRIMARY KEY,
  unit_id         INTEGER NOT NULL REFERENCES units(id),
  company_id      INTEGER NOT NULL REFERENCES companies(id),
  facility_type   facility_type NOT NULL,
  location        TEXT,
  inventoried_at  DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE radiation_trainings (
  id                        SERIAL PRIMARY KEY,
  unit_id                   INTEGER NOT NULL REFERENCES units(id),
  training_name             TEXT NOT NULL,
  category                  training_category NOT NULL,
  company_id                INTEGER REFERENCES companies(id),
  staff_user_id             INTEGER REFERENCES users(id),
  number_of_persons_trained INTEGER NOT NULL DEFAULT 1,
  location                  TEXT,
  training_date             DATE NOT NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Waste and Remediation Unit specific
-- ---------------------------------------------------------------------------

CREATE TABLE esia_participations (
  id           SERIAL PRIMARY KEY,
  unit_id      INTEGER NOT NULL REFERENCES units(id),
  project_name TEXT NOT NULL,
  role         TEXT,
  meeting_date DATE NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Shared, cross-unit systems
-- ---------------------------------------------------------------------------

CREATE TABLE kpi_deliverables (
  id            SERIAL PRIMARY KEY,
  unit_id       INTEGER REFERENCES units(id), -- null = cross-unit/department-wide
  label         TEXT NOT NULL,
  year          INTEGER NOT NULL,
  annual_target DOUBLE PRECISION NOT NULL,
  target_unit   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE kpi_monthly_entries (
  id                 SERIAL PRIMARY KEY,
  kpi_deliverable_id INTEGER NOT NULL REFERENCES kpi_deliverables(id),
  month              INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year               INTEGER NOT NULL,
  value              DOUBLE PRECISION NOT NULL,
  UNIQUE (kpi_deliverable_id, month, year)
);

CREATE TABLE reminders (
  id               SERIAL PRIMARY KEY,
  unit_id          INTEGER NOT NULL REFERENCES units(id),
  company_id       INTEGER REFERENCES companies(id),
  case_document_id INTEGER REFERENCES case_documents(id),
  subject          TEXT NOT NULL,
  description      TEXT,
  due_date         DATE NOT NULL,
  sent_at          TIMESTAMPTZ,
  status           reminder_status NOT NULL DEFAULT 'SCHEDULED',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE assets (
  id                   SERIAL PRIMARY KEY,
  unit_id              INTEGER REFERENCES units(id), -- null = shared/department-wide
  name                 TEXT NOT NULL,
  category             asset_category NOT NULL,
  serial_number        TEXT,
  assigned_to          TEXT,
  status               asset_status NOT NULL DEFAULT 'OPERATIONAL',
  last_calibrated_at   DATE,
  calibration_due_date DATE,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE activity_logs (
  id             SERIAL PRIMARY KEY,
  unit_id        INTEGER NOT NULL REFERENCES units(id),
  type           activity_type NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  event_date     DATE NOT NULL,
  attendee_count INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   INTEGER,
  details     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Session store (for connect-pg-simple)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS session (
  sid    VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
  sess   JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS session_expire_idx ON session (expire);

-- ---------------------------------------------------------------------------
-- Helpful indexes
-- ---------------------------------------------------------------------------

CREATE INDEX idx_case_documents_unit ON case_documents(unit_id);
CREATE INDEX idx_case_documents_company ON case_documents(company_id);
CREATE INDEX idx_case_documents_type ON case_documents(document_type_id);
CREATE INDEX idx_case_documents_status ON case_documents(status);
CREATE INDEX idx_complaints_unit ON complaints(unit_id);
CREATE INDEX idx_reminders_due ON reminders(due_date) WHERE status = 'SCHEDULED';
CREATE INDEX idx_lab_results_company ON lab_results(company_id);
CREATE INDEX idx_kpi_monthly_deliverable ON kpi_monthly_entries(kpi_deliverable_id);
