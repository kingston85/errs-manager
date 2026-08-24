// Enables trigram similarity matching, used by the duplicate-company/
// duplicate-chemical finder at /app/tools/duplicates (src/routes/tools.js).
exports.up = (pgm) => {
  pgm.sql('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
  // Speeds up similarity()/ILIKE '%...%' lookups on the two name columns
  // the duplicate finder and generic search boxes query most.
  pgm.sql('CREATE INDEX IF NOT EXISTS idx_companies_name_trgm ON companies USING gin (name gin_trgm_ops);');
  pgm.sql('CREATE INDEX IF NOT EXISTS idx_chemicals_name_trgm ON chemicals USING gin (name gin_trgm_ops);');
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS idx_chemicals_name_trgm;');
  pgm.sql('DROP INDEX IF EXISTS idx_companies_name_trgm;');
  pgm.sql('DROP EXTENSION IF EXISTS pg_trgm;');
};
