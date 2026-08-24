// Adds explicit ON DELETE behavior to every NULLABLE foreign key — deleting
// the row it points to now clears the reference instead of throwing a raw
// constraint-violation error (which the server.js error handler now also
// renders in plain language, for the columns below this doesn't still
// apply to). NOT NULL foreign keys (case_documents.company_id,
// lab_results.company_id, every table's own unit_id, etc.) deliberately
// keep the default RESTRICT behavior — silently cascade-deleting a
// company's entire licensing history because someone removed the company
// record would be far worse than the delete simply being blocked.
const SET_NULL_FKS = [
  { table: 'users', column: 'unit_id', refTable: 'units' },
  { table: 'case_documents', column: 'chemical_id', refTable: 'chemicals' },
  { table: 'case_documents', column: 'created_by_id', refTable: 'users' },
  { table: 'chemical_escorts', column: 'company_id', refTable: 'companies' },
  { table: 'chemical_escorts', column: 'chemical_id', refTable: 'chemicals' },
  { table: 'complaints', column: 'created_by_id', refTable: 'users' },
  { table: 'radiation_trainings', column: 'company_id', refTable: 'companies' },
  { table: 'radiation_trainings', column: 'staff_user_id', refTable: 'users' },
  { table: 'kpi_deliverables', column: 'unit_id', refTable: 'units' },
  { table: 'reminders', column: 'company_id', refTable: 'companies' },
  { table: 'reminders', column: 'case_document_id', refTable: 'case_documents' },
  { table: 'assets', column: 'unit_id', refTable: 'units' },
  { table: 'audit_logs', column: 'user_id', refTable: 'users' },
];

exports.up = (pgm) => {
  for (const fk of SET_NULL_FKS) {
    const constraint = `${fk.table}_${fk.column}_fkey`;
    pgm.sql(`ALTER TABLE ${fk.table} DROP CONSTRAINT IF EXISTS ${constraint};`);
    pgm.sql(`ALTER TABLE ${fk.table} ADD CONSTRAINT ${constraint}
              FOREIGN KEY (${fk.column}) REFERENCES ${fk.refTable}(id) ON DELETE SET NULL;`);
  }
};

exports.down = (pgm) => {
  for (const fk of SET_NULL_FKS) {
    const constraint = `${fk.table}_${fk.column}_fkey`;
    pgm.sql(`ALTER TABLE ${fk.table} DROP CONSTRAINT IF EXISTS ${constraint};`);
    pgm.sql(`ALTER TABLE ${fk.table} ADD CONSTRAINT ${constraint}
              FOREIGN KEY (${fk.column}) REFERENCES ${fk.refTable}(id);`);
  }
};
