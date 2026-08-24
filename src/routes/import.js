// CSV bulk import for the controlled master-data lists — companies and
// chemicals. Deliberately scoped to just these two (not every generic
// entity) since they're the tables with a real UNIQUE(name) to upsert
// against safely; this is also exactly the kind of table this session's
// own quarterly-report import work spent the most manual effort on.
// Mounted at /app (so routes land at /app/companies/import etc, alongside
// the entity's own list/form routes).
const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../lib/db');
const { ENTITIES } = require('../lib/entities');
const { logAudit } = require('../lib/audit');
const { parseCsv } = require('../lib/csv');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

const IMPORTABLE = ['companies', 'chemicals'];

function labelToField(entity) {
  const map = {};
  for (const f of entity.fields) map[f.label] = f;
  return map;
}

router.get('/:entityKey/import', (req, res) => {
  const entity = ENTITIES[req.params.entityKey];
  if (!entity || !IMPORTABLE.includes(req.params.entityKey)) {
    return res.status(404).render('error', { title: 'Not found', message: 'Bulk import isn’t available for that record type.' });
  }
  res.render('generic/import', {
    title: `Import ${entity.label}`,
    entity, entityKey: req.params.entityKey,
    expectedColumns: ['Name (or the entity\'s own name column)', ...entity.fields.map((f) => f.label)],
    result: null,
  });
});

router.post('/:entityKey/import', upload.single('file'), async (req, res) => {
  const entity = ENTITIES[req.params.entityKey];
  if (!entity || !IMPORTABLE.includes(req.params.entityKey)) {
    return res.status(404).render('error', { title: 'Not found', message: 'Bulk import isn’t available for that record type.' });
  }
  if (!req.file) {
    return res.status(400).render('generic/import', { title: `Import ${entity.label}`, entity, entityKey: req.params.entityKey, expectedColumns: entity.fields.map((f) => f.label), result: { error: 'No file was uploaded.' } });
  }

  let records;
  try {
    records = parseCsv(req.file.buffer);
  } catch (e) {
    return res.status(400).render('generic/import', { title: `Import ${entity.label}`, entity, entityKey: req.params.entityKey, expectedColumns: entity.fields.map((f) => f.label), result: { error: `Could not read that file as CSV: ${e.message}` } });
  }

  const fieldByLabel = labelToField(entity);
  let created = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const cols = [];
    const vals = [];
    for (const [label, raw] of Object.entries(row)) {
      const field = fieldByLabel[label] || entity.fields.find((f) => f.name === label);
      if (!field || raw === undefined || raw === '') continue;
      cols.push(field.name);
      if (field.type === 'taglist') vals.push(raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean));
      else if (field.type === 'number') vals.push(Number(raw));
      else vals.push(raw);
    }
    if (!cols.length) { skipped++; continue; }
    try {
      const placeholders = cols.map((_, idx) => `$${idx + 1}`);
      const { rowCount } = await db.query(
        `INSERT INTO ${entity.table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) ON CONFLICT (name) DO NOTHING`,
        vals
      );
      if (rowCount) created++; else skipped++; // rowCount 0 = ON CONFLICT DO NOTHING skipped an existing name
    } catch (e) {
      errors.push(`Row ${i + 2}: ${e.message}`);
    }
  }

  await logAudit(req.user.id, 'IMPORT', entity.table, null, `Imported ${created} of ${records.length} rows from CSV (${skipped} already existed, ${errors.length} errors)`);

  res.render('generic/import', {
    title: `Import ${entity.label}`,
    entity, entityKey: req.params.entityKey,
    expectedColumns: entity.fields.map((f) => f.label),
    result: { total: records.length, created, skipped, errors },
  });
});

module.exports = router;
