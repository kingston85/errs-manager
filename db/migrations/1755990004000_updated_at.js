// Previously only case_documents tracked updated_at, and even there it was
// set by hand in application code (easy to forget on some future direct
// SQL fix). This adds the column to every table the app lets someone edit,
// plus a trigger that keeps it current automatically regardless of how the
// row gets updated — application code, a future migration's data fix, or a
// one-off psql session.
const EDITABLE_TABLES = [
  'companies', 'chemicals', 'chemical_escorts', 'chemical_inventory_audits',
  'site_inspections', 'complaints', 'lab_results', 'reporting_quality_entries',
  'radiation_inventories', 'radiation_trainings', 'esia_participations',
  'kpi_deliverables', 'kpi_monthly_entries', 'reminders', 'assets', 'activity_logs',
  'users',
];

exports.up = (pgm) => {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  for (const table of EDITABLE_TABLES) {
    pgm.sql(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();`);
    pgm.sql(`DROP TRIGGER IF EXISTS trg_${table}_updated_at ON ${table};`);
    pgm.sql(`CREATE TRIGGER trg_${table}_updated_at BEFORE UPDATE ON ${table}
              FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
  }

  // case_documents already had the column; just make sure the trigger
  // covers it too so it stops depending on every call site remembering to
  // set updated_at=now() by hand.
  pgm.sql(`DROP TRIGGER IF EXISTS trg_case_documents_updated_at ON case_documents;`);
  pgm.sql(`CREATE TRIGGER trg_case_documents_updated_at BEFORE UPDATE ON case_documents
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
};

exports.down = (pgm) => {
  for (const table of [...EDITABLE_TABLES, 'case_documents']) {
    pgm.sql(`DROP TRIGGER IF EXISTS trg_${table}_updated_at ON ${table};`);
  }
  for (const table of EDITABLE_TABLES) {
    pgm.sql(`ALTER TABLE ${table} DROP COLUMN IF EXISTS updated_at;`);
  }
  pgm.sql(`DROP FUNCTION IF EXISTS set_updated_at();`);
};
