// One list+form+CRUD implementation shared by every "flat table" entity in
// src/lib/entities.js. Mounted at /app/:entityKey/... See that file's header
// comment for the field-type vocabulary this reads.
const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { ENTITIES } = require('../lib/entities');
const { logAudit, diffForAudit } = require('../lib/audit');
const { loadOwnedRecord } = require('../middleware/access');
const { canAccessEntity, unitIdForKey, buildWhere, parseIdsParam, withIdsFilter } = require('../lib/entityAccess');
const { sendCsv } = require('../lib/csv');
const { upload } = require('../lib/attachmentUpload');
const { makeAttachmentHandlers, listAttachments } = require('../lib/attachmentHandlers');

const PAGE_SIZE = 25;

const attachments = makeAttachmentHandlers({
  getTable: (req) => req.entity.table,
  redirectTo: (req) => `/app/${req.entityKey}/${req.params.id}/edit`,
});

// ---- helpers ---------------------------------------------------------

function getEntity(req, res, next) {
  const entity = ENTITIES[req.params.entityKey];
  if (!entity) return res.status(404).render('error', { title: 'Not found', message: 'Unknown record type.' });
  req.entity = entity;
  req.entityKey = req.params.entityKey;
  next();
}

async function loadFkOptions(entity) {
  const opts = {};
  for (const f of entity.fields) {
    if (f.type === 'fk') {
      const { rows } = await db.query(`SELECT id, ${f.fkLabel} AS label FROM ${f.fkTable} ORDER BY ${f.fkLabel} ASC`);
      opts[f.name] = rows;
    }
  }
  return opts;
}

async function loadUnits() {
  const { rows } = await db.query('SELECT id, key, name FROM units ORDER BY name');
  return rows;
}

// Parses posted form values into the right JS type per field.type so the
// pg driver binds them correctly (numbers as numbers, arrays as arrays,
// blanks as SQL NULL rather than empty strings).
function coerceValue(field, raw) {
  if (raw === undefined || raw === '') return null;
  switch (field.type) {
    case 'number': return Number(raw);
    case 'taglist': return raw.split(',').map((s) => s.trim()).filter(Boolean);
    case 'fk': return Number(raw);
    default:
      if (field.type === 'enum' && (raw === 'true' || raw === 'false')) return raw === 'true';
      return raw;
  }
}

// ---- routes ------------------------------------------------------------

router.use('/:entityKey', getEntity);

router.get('/:entityKey', async (req, res) => {
  const entity = req.entity;
  if (!canAccessEntity(req.user, entity)) return res.status(403).render('error', { title: 'Not allowed', message: "This belongs to a different unit." });

  const { where, params } = await buildWhere(entity, req);

  const { rows: countRows } = await db.query(`SELECT COUNT(*) AS n FROM ${entity.table} ${where}`, params);
  const total = Number(countRows[0].n);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const offset = (Math.min(page, totalPages) - 1) * PAGE_SIZE;

  const selectFields = ['id', ...entity.fields.map((f) => f.name)];
  if (entity.unitScoped) selectFields.push('unit_id');
  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;
  const { rows } = await db.query(
    `SELECT ${selectFields.join(', ')} FROM ${entity.table} ${where} ORDER BY ${entity.orderBy || 'id DESC'} LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...params, PAGE_SIZE, offset]
  );

  const fkOptions = await loadFkOptions(entity);
  const fkLabelMaps = {};
  for (const [name, opts] of Object.entries(fkOptions)) {
    fkLabelMaps[name] = Object.fromEntries(opts.map((o) => [o.id, o.label]));
  }
  const units = entity.unitScoped && !entity.unit && req.user.role === 'DEPT_HEAD' ? await loadUnits() : null;

  res.render('generic/list', {
    title: entity.label, entity, entityKey: req.entityKey, rows, fkLabelMaps, units,
    selectedUnit: req.query.unit || null,
    q: req.query.q || '',
    page: Math.min(page, totalPages), totalPages, total, pageSize: PAGE_SIZE,
  });
});

router.get('/:entityKey/export.csv', async (req, res) => {
  const entity = req.entity;
  if (!canAccessEntity(req.user, entity)) return res.status(403).render('error', { title: 'Not allowed', message: "This belongs to a different unit." });

  const base = await buildWhere(entity, req);
  // A "bulk export" from the list page's selection checkboxes (see
  // public/js/app.js's initBulkActions) narrows to just those ids, on top
  // of whatever filters/search are already active.
  const { where, params } = withIdsFilter(base.where, base.params, parseIdsParam(req.query.ids));
  const selectFields = ['id', ...entity.fields.map((f) => f.name)];
  const { rows } = await db.query(
    `SELECT ${selectFields.join(', ')} FROM ${entity.table} ${where} ORDER BY ${entity.orderBy || 'id DESC'}`,
    params
  );

  // Resolve fk columns to their label and taglist arrays to a joined
  // string so the export reads the way a person would fill it back in,
  // not as raw internal ids.
  const fkOptions = await loadFkOptions(entity);
  const fkLabelMaps = {};
  for (const [name, opts] of Object.entries(fkOptions)) {
    fkLabelMaps[name] = Object.fromEntries(opts.map((o) => [o.id, o.label]));
  }
  const flat = rows.map((row) => {
    const out = { id: row.id };
    for (const f of entity.fields) {
      let v = row[f.name];
      if (f.type === 'fk' && v != null) v = (fkLabelMaps[f.name] && fkLabelMaps[f.name][v]) || v;
      if (f.type === 'taglist' && Array.isArray(v)) v = v.join('; ');
      out[f.label] = v === null || v === undefined ? '' : v;
    }
    return out;
  });

  sendCsv(res, `${req.entityKey}.csv`, flat, ['id', ...entity.fields.map((f) => f.label)]);
});

router.get('/:entityKey/new', async (req, res) => {
  const entity = req.entity;
  if (!canAccessEntity(req.user, entity)) return res.status(403).render('error', { title: 'Not allowed', message: "This belongs to a different unit." });
  const fkOptions = await loadFkOptions(entity);
  const units = entity.unitScoped && !entity.unit && req.user.role === 'DEPT_HEAD' ? await loadUnits() : null;
  res.render('generic/form', { title: `Add ${entity.labelSingular}`, entity, entityKey: req.entityKey, record: {}, fkOptions, units, isNew: true });
});

router.post('/:entityKey', async (req, res) => {
  const entity = req.entity;
  if (!canAccessEntity(req.user, entity)) return res.status(403).render('error', { title: 'Not allowed', message: "This belongs to a different unit." });

  const cols = [];
  const vals = [];
  for (const f of entity.fields) {
    cols.push(f.name);
    vals.push(coerceValue(f, req.body[f.name]));
  }
  if (entity.unitScoped) {
    cols.push('unit_id');
    if (entity.unit) {
      vals.push(await unitIdForKey(entity.unit));
    } else if (req.user.role === 'DEPT_HEAD' && req.body.unit_id) {
      vals.push(Number(req.body.unit_id));
    } else {
      vals.push(req.user.unit_id);
    }
  }
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const { rows } = await db.query(
    `INSERT INTO ${entity.table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`,
    vals
  );
  await logAudit(req.user.id, 'CREATE', entity.table, rows[0].id, null);
  req.flash('success', `${entity.labelSingular} created.`);
  res.redirect(`/app/${req.entityKey}`);
});

// Deletes every selected row at once (see the list page's checkbox column
// and public/js/app.js's initBulkActions). Registered before the
// /:entityKey/:id routes below — both are POSTs and "bulk-delete" would
// otherwise be swallowed by :id="bulk-delete" if that route matched first.
router.post('/:entityKey/bulk-delete', async (req, res) => {
  const entity = req.entity;
  if (!canAccessEntity(req.user, entity)) return res.status(403).render('error', { title: 'Not allowed', message: "This belongs to a different unit." });
  if (req.user.role === 'INTERN') return res.status(403).render('error', { title: 'Not allowed', message: 'Interns cannot delete records.' });

  const ids = parseIdsParam(Array.isArray(req.body.ids) ? req.body.ids.join(',') : req.body.ids);
  if (!ids.length) {
    req.flash('error', 'No rows were selected.');
    return res.redirect(`/app/${req.entityKey}`);
  }

  // Same unit-scoping every other row-level route on this entity enforces
  // (see middleware/access.js's loadOwnedRecord) — a Staff/Unit Head account
  // can only ever delete rows that are actually theirs, even if they crafted
  // ids belonging to another unit into the request by hand.
  const params = [ids];
  let unitClause = '';
  if (entity.unitScoped && req.user.role !== 'DEPT_HEAD') {
    params.push(req.user.unit_id);
    unitClause = ' AND unit_id = $2';
  }
  const { rowCount } = await db.query(`DELETE FROM ${entity.table} WHERE id = ANY($1::int[])${unitClause}`, params);
  await logAudit(req.user.id, 'DELETE', entity.table, null, `Bulk deleted ${rowCount} record(s)`);
  req.flash('success', `Deleted ${rowCount} record${rowCount === 1 ? '' : 's'}.`);
  res.redirect(`/app/${req.entityKey}`);
});

// The three row-level routes below all need the *entity's own* table name,
// which only exists once getEntity (mounted above) has already run — so
// each wraps loadOwnedRecord in a small adapter rather than registering it
// as static middleware.
async function withOwnedRecord(req, res, next) {
  return loadOwnedRecord(req.entity.table, {
    unitColumn: req.entity.unitScoped ? 'unit_id' : null,
    forbiddenMessage: 'That record belongs to a different unit.',
  })(req, res, next);
}

router.get('/:entityKey/:id/edit', async (req, res, next) => {
  const entity = req.entity;
  if (!canAccessEntity(req.user, entity)) return res.status(403).render('error', { title: 'Not allowed', message: "This belongs to a different unit." });
  await withOwnedRecord(req, res, async () => {
    const record = req.record;
    const fkOptions = await loadFkOptions(entity);
    const units = entity.unitScoped && !entity.unit && req.user.role === 'DEPT_HEAD' ? await loadUnits() : null;
    // taglist fields come back from pg as real JS arrays — the form input
    // wants a comma-joined string to edit.
    for (const f of entity.fields) if (f.type === 'taglist' && Array.isArray(record[f.name])) record[f.name] = record[f.name].join(', ');
    const attachmentsList = await listAttachments(entity.table, record.id);
    res.render('generic/form', { title: `Edit ${entity.labelSingular}`, entity, entityKey: req.entityKey, record, fkOptions, units, isNew: false, attachments: attachmentsList, attachmentsBase: `/app/${req.entityKey}/${record.id}/attachments` });
  });
});

// Attachments (upload a scan/photo, view/download it, remove it) for any
// generic entity — see src/lib/attachmentHandlers.js. Ownership is checked
// the same way every other row-level route on this entity is: withOwnedRecord.
router.post('/:entityKey/:id/attachments', upload.single('file'), async (req, res) => {
  const entity = req.entity;
  if (!canAccessEntity(req.user, entity)) return res.status(403).render('error', { title: 'Not allowed', message: "This belongs to a different unit." });
  await withOwnedRecord(req, res, () => attachments.upload(req, res));
});

router.get('/:entityKey/:id/attachments/:attachmentId', async (req, res) => {
  const entity = req.entity;
  if (!canAccessEntity(req.user, entity)) return res.status(403).render('error', { title: 'Not allowed', message: "This belongs to a different unit." });
  await withOwnedRecord(req, res, () => attachments.download(req, res));
});

router.post('/:entityKey/:id/attachments/:attachmentId/delete', async (req, res) => {
  const entity = req.entity;
  if (!canAccessEntity(req.user, entity)) return res.status(403).render('error', { title: 'Not allowed', message: "This belongs to a different unit." });
  if (req.user.role === 'INTERN') return res.status(403).render('error', { title: 'Not allowed', message: 'Interns cannot delete records.' });
  await withOwnedRecord(req, res, () => attachments.remove(req, res));
});

router.post('/:entityKey/:id', async (req, res) => {
  const entity = req.entity;
  if (!canAccessEntity(req.user, entity)) return res.status(403).render('error', { title: 'Not allowed', message: "This belongs to a different unit." });
  await withOwnedRecord(req, res, async () => {
    const before = req.record;
    const sets = [];
    const vals = [];
    const after = {};
    for (const f of entity.fields) {
      const v = coerceValue(f, req.body[f.name]);
      after[f.name] = v;
      vals.push(v);
      sets.push(`${f.name} = $${vals.length}`);
    }
    if (entity.unitScoped && !entity.unit && req.user.role === 'DEPT_HEAD' && req.body.unit_id) {
      vals.push(Number(req.body.unit_id));
      sets.push(`unit_id = $${vals.length}`);
    }
    vals.push(req.params.id);
    await db.query(`UPDATE ${entity.table} SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals);
    await logAudit(req.user.id, 'UPDATE', entity.table, Number(req.params.id), diffForAudit(before, after));
    req.flash('success', `${entity.labelSingular} updated.`);
    res.redirect(`/app/${req.entityKey}`);
  });
});

router.post('/:entityKey/:id/delete', async (req, res) => {
  const entity = req.entity;
  if (!canAccessEntity(req.user, entity)) return res.status(403).render('error', { title: 'Not allowed', message: "This belongs to a different unit." });
  if (req.user.role === 'INTERN') return res.status(403).render('error', { title: 'Not allowed', message: 'Interns cannot delete records.' });
  // This ownership check used to be missing here specifically — the edit
  // and update routes both had it, delete didn't, which let a Staff/Unit
  // Head account delete another unit's reminders/assets/activity_logs by
  // posting a guessed id. Now all three go through the same helper.
  await withOwnedRecord(req, res, async () => {
    await db.query(`DELETE FROM ${entity.table} WHERE id = $1`, [req.params.id]);
    await logAudit(req.user.id, 'DELETE', entity.table, Number(req.params.id), null);
    req.flash('success', `${entity.labelSingular} deleted.`);
    res.redirect(`/app/${req.entityKey}`);
  });
});

module.exports = router;
