// One list+form+CRUD implementation shared by every "flat table" entity in
// src/lib/entities.js. Mounted at /app/:entityKey/... See that file's header
// comment for the field-type vocabulary this reads.
const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { ENTITIES } = require('../lib/entities');
const { logAudit, diffForAudit } = require('../lib/audit');
const { loadOwnedRecord } = require('../middleware/access');
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

// A fixed-unit entity (e.g. chemical_escorts is always CHEMICAL) may only
// be touched by that unit's own staff, or the Department Head who can see
// everything. A flexible-unit entity (reminders, assets, activity_logs)
// is scoped to the viewer's own unit unless they're Department Head.
function canAccessEntity(user, entity) {
  if (user.role === 'DEPT_HEAD') return true;
  if (!entity.unitScoped) return true; // shared master data (companies, chemicals) — everyone can view/manage
  if (entity.unit) return user.unit_key === entity.unit;
  return true; // flexible-unit entity — access ok, scoping happens per-row below
}

async function unitIdForKey(key) {
  const { rows } = await db.query('SELECT id FROM units WHERE key = $1', [key]);
  return rows[0] ? rows[0].id : null;
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

// Builds the WHERE clause shared by the list page and the CSV export:
// unit scoping (see entity.unitScoped/entity.unit) plus a free-text search
// across the entity's own text/textarea fields. Search intentionally
// doesn't reach into fk-linked tables (e.g. searching a company name from
// the chemical_escorts list) — that's a reasonable v2, not a correctness
// issue today.
async function buildWhere(entity, req) {
  const params = [];
  const conditions = [];

  if (entity.unitScoped) {
    if (entity.unit) {
      const uid = await unitIdForKey(entity.unit);
      params.push(uid);
      conditions.push(`unit_id = $${params.length}`);
    } else if (req.user.role !== 'DEPT_HEAD') {
      params.push(req.user.unit_id);
      conditions.push(`unit_id = $${params.length}`);
    } else if (req.query.unit) {
      const uid = await unitIdForKey(req.query.unit);
      if (uid) { params.push(uid); conditions.push(`unit_id = $${params.length}`); }
    }
  }

  const q = (req.query.q || '').trim();
  if (q) {
    const searchable = entity.fields.filter((f) => f.type === 'text' || f.type === 'textarea');
    if (searchable.length) {
      params.push(`%${q}%`);
      const idx = params.length;
      conditions.push(`(${searchable.map((f) => `${f.name} ILIKE $${idx}`).join(' OR ')})`);
    }
  }

  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
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

  const { where, params } = await buildWhere(entity, req);
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
    res.redirect(`/app/${req.entityKey}`);
  });
});

module.exports = router;
