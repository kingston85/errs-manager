// Baseline migration — reproduces db/schema.sql verbatim so a brand-new
// database can be brought up with `npm run migrate` alone, and so
// schema.sql stays the single source of truth for "what a fresh install
// looks like" rather than duplicating ~370 lines of DDL into this file.
//
// For a database that already had schema.sql applied by hand (every
// environment this app was actually running in before migrations existed —
// see db/migrations/README.md), this migration is marked as already-run
// directly in the pgmigrations tracking table rather than executed, since
// re-running these CREATE TABLE statements against existing tables would
// fail. New environments run it like any other migration.
const fs = require('fs');
const path = require('path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  pgm.sql(sql);
};

exports.down = (pgm) => {
  throw new Error('The baseline migration is not reversible — restore from a backup instead.');
};
