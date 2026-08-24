// The unified License / Clearance / Certificate / Bill engine — one screen
// type shared by every document_type across all four units (see
// db/schema.sql's header comment for why). Mounted at /app/documents.
const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { allocateNumber, usageThisYear } = require('../lib/numbering');
const { logAudit, diffForAudit } = require('../lib/audit');
const { loadOwnedRecord } = require('../middleware/access');
const { parseIdsParam, withIdsFilter } = require('../lib/entityAccess');
const { sendCsv } = require('../lib/csv');
const { upload } = require('../lib/attachmentUpload');
const { makeAttachmentHandlers, listAttachments } = require('../lib/attachmentHandlers');

const ownedCase = loadOwnedRecord('case_documents', { forbiddenMessage: 'That case belongs to a different unit.' });

const attachments = makeAttachmentHandlers({
  getTable: () => 'case_documents',
  redirectTo: (req) => `/app/documents/${req.params.id}/edit`,
});

function unitFilterFor(user) {
  return user.role === 'DEPT_HEAD' ? null : user.unit_id;
}

// Builds the shared WHERE clause (unit scoping, status/type filters, free
// text search) without running any query — both the paginated list route
// and the CSV export need the same filters applied to differently-shaped
// queries (one paginated, one not), so this stays a pure builder rather
// than fetching rows itself.
function caseFilters(req) {
  const unitId = unitFilterFor(req.user) || (req.query.unit ? Number(req.query.unit) : null);
  const statusFilter = req.query.status || null;
  const typeFilter = req.query.type ? Number(req.query.type) : null;
  const q = (req.query.q || '').trim();

  const conditions = [];
  const params = [];
  if (unitId) { params.push(unitId); conditions.push(`cd.unit_id = $${params.length}`); }
  if (statusFilter) { params.push(statusFilter); conditions.push(`cd.status = $${params.length}`); }
  if (typeFilter) { params.push(typeFilter); conditions.push(`cd.document_type_id = $${params.length}`); }
  if (q) {
    params.push(`%${q}%`);
    const idx = params.length;
    conditions.push(`(c.name ILIKE $${idx} OR cd.document_number ILIKE $${idx} OR cd.reference_code ILIKE $${idx} OR cd.activity ILIKE $${idx})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params, unitId, statusFilter, typeFilter, q };
}

const CASE_SELECT = `SELECT cd.*, c.name AS company_name, dt.label AS type_label, dt.kind AS type_kind, un.name AS unit_name, ch.name AS chemical_name
     FROM case_documents cd
     JOIN companies c ON c.id = cd.company_id
     JOIN document_types dt ON dt.id = cd.document_type_id
     JOIN units un ON un.id = cd.unit_id
     LEFT JOIN chemicals ch ON ch.id = cd.chemical_id`;

// A case is worth flagging for renewal once it's within this many days of
// its expiry (or already past it) — matches the "due soon" window the
// dashboard/email-reminder digest already uses elsewhere in the app, so
// staff see the same "coming up" horizon everywhere.
const RENEWAL_WINDOW_DAYS = 60;

function isRenewable(row) {
  if (row.status !== 'ISSUED' || !row.expiry_date) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + RENEWAL_WINDOW_DAYS);
  return new Date(row.expiry_date) <= cutoff;
}

router.get('/', async (req, res) => {
  const PAGE_SIZE = 25;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const { where, params, unitId, statusFilter, typeFilter, q } = caseFilters(req);

  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) AS n FROM case_documents cd JOIN companies c ON c.id = cd.company_id ${where}`,
    params
  );
  const total = Number(countRows[0].n);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const offset = (Math.min(page, totalPages) - 1) * PAGE_SIZE;

  const { rows } = await db.query(
    `${CASE_SELECT} ${where} ORDER BY cd.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, PAGE_SIZE, offset]
  );

  const units = (await db.query('SELECT * FROM units ORDER BY name')).rows;
  const types = (await db.query('SELECT * FROM document_types ORDER BY label')).rows;

  // Which of these cases already have a renewal on file — so the list
  // doesn't offer a second "Renew" for one that's already been renewed.
  const { rows: renewedFromRows } = await db.query(
    `SELECT DISTINCT renewed_from_id FROM case_documents WHERE renewed_from_id = ANY($1::int[])`,
    [rows.map((r) => r.id)]
  );
  const alreadyRenewedIds = new Set(renewedFromRows.map((r) => r.renewed_from_id));

  res.render('documents/list', {
    title: 'Licenses, Clearances, Certificates & Bills',
    rows, units, types, unitFilter: unitId, statusFilter, typeFilter, q,
    isDeptHead: req.user.role === 'DEPT_HEAD',
    page: Math.min(page, totalPages), totalPages, total, pageSize: PAGE_SIZE,
    isRenewable, alreadyRenewedIds,
  });
});

router.get('/export.csv', async (req, res) => {
  const base = caseFilters(req);
  // A "bulk export" from the list page's selection checkboxes narrows to
  // just those ids, on top of whatever filters/search are already active.
  const { where, params } = withIdsFilter(base.where, base.params, parseIdsParam(req.query.ids), 'cd.id');
  const { rows } = await db.query(`${CASE_SELECT} ${where} ORDER BY cd.created_at DESC`, params);
  const flat = rows.map((r) => ({
    id: r.id,
    Type: r.type_label,
    Company: r.company_name,
    Chemical: r.chemical_name || '',
    Unit: r.unit_name,
    Status: r.status,
    'Document #': r.document_number || '',
    'Application Date': r.application_date || '',
    'Date Issued': r.date_issued || '',
    'Expiry Date': r.expiry_date || '',
    'Amount Paid': r.amount_paid ?? '',
    'Receipt #': r.receipt_number || '',
    Notes: r.notes || '',
  }));
  sendCsv(res, 'documents.csv', flat, ['id', 'Type', 'Company', 'Chemical', 'Unit', 'Status', 'Document #', 'Application Date', 'Date Issued', 'Expiry Date', 'Amount Paid', 'Receipt #', 'Notes']);
});

router.get('/new', async (req, res) => {
  const unitId = unitFilterFor(req.user);
  const types = unitId
    ? (await db.query('SELECT * FROM document_types WHERE unit_id = $1 ORDER BY label', [unitId])).rows
    : (await db.query('SELECT dt.*, u.name AS unit_name FROM document_types dt JOIN units u ON u.id = dt.unit_id ORDER BY u.name, dt.label')).rows;
  const companies = (await db.query('SELECT id, name FROM companies ORDER BY name')).rows;
  const chemicals = (await db.query('SELECT id, name FROM chemicals ORDER BY name')).rows;
  const units = req.user.role === 'DEPT_HEAD' ? (await db.query('SELECT * FROM units ORDER BY name')).rows : null;
  res.render('documents/form', { title: 'New Case', record: {}, types, companies, chemicals, units, isNew: true });
});

router.post('/', async (req, res) => {
  const b = req.body;
  const unitId = unitFilterFor(req.user) || Number(b.unit_id);
  const { rows } = await db.query(
    `INSERT INTO case_documents
      (document_type_id, unit_id, company_id, chemical_id, activity, quantity, quantity_unit,
       application_date, response_date, reference_code, amount_paid, receipt_number, notes, status, created_by_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
    [
      Number(b.document_type_id), unitId, Number(b.company_id), b.chemical_id ? Number(b.chemical_id) : null,
      b.activity || null, b.quantity ? Number(b.quantity) : null, b.quantity_unit || null,
      b.application_date || null, b.response_date || null, b.reference_code || null,
      b.amount_paid ? Number(b.amount_paid) : null, b.receipt_number || null, b.notes || null,
      b.status || 'APPLICATION_RECEIVED', req.user.id,
    ]
  );
  await logAudit(req.user.id, 'CREATE', 'case_documents', rows[0].id, null);
  req.flash('success', 'Case created.');
  res.redirect('/app/documents');
});

// Deletes every selected case at once (see the list page's checkbox column
// and public/js/app.js's initBulkActions). Registered before /:id routes —
// both are POSTs, and "bulk-delete" would otherwise be swallowed by
// :id="bulk-delete" if that route matched first.
router.post('/bulk-delete', async (req, res) => {
  if (req.user.role === 'INTERN') return res.status(403).render('error', { title: 'Not allowed', message: 'Interns cannot delete records.' });
  const ids = parseIdsParam(Array.isArray(req.body.ids) ? req.body.ids.join(',') : req.body.ids);
  if (!ids.length) {
    req.flash('error', 'No rows were selected.');
    return res.redirect('/app/documents');
  }
  const params = [ids];
  let unitClause = '';
  if (req.user.role !== 'DEPT_HEAD') {
    params.push(req.user.unit_id);
    unitClause = ' AND unit_id = $2';
  }
  const { rowCount } = await db.query(`DELETE FROM case_documents WHERE id = ANY($1::int[])${unitClause}`, params);
  await logAudit(req.user.id, 'DELETE', 'case_documents', null, `Bulk deleted ${rowCount} case(s)`);
  req.flash('success', `Deleted ${rowCount} case${rowCount === 1 ? '' : 's'}.`);
  res.redirect('/app/documents');
});

router.get('/:id/edit', ownedCase, async (req, res) => {
  const { rows } = await db.query(
    `SELECT dt.label AS type_label, dt.kind AS type_kind, dt.validity, dt.block_size FROM document_types dt WHERE dt.id = $1`,
    [req.record.document_type_id]
  );
  const record = { ...req.record, ...rows[0] };
  const companies = (await db.query('SELECT id, name FROM companies ORDER BY name')).rows;
  const chemicals = (await db.query('SELECT id, name FROM chemicals ORDER BY name')).rows;
  const usedThisYear = await usageThisYear(record.document_type_id, new Date().getFullYear());
  const attachmentsList = await listAttachments('case_documents', record.id);

  // Renewal linkage, shown both directions: what this case renewed (if
  // anything), and what later renewed this case (if anything) — so staff
  // looking at either end of the chain can jump straight to the other.
  let renewedFrom = null;
  if (record.renewed_from_id) {
    const { rows: r } = await db.query(
      `SELECT cd.id, cd.document_number, dt.label AS type_label FROM case_documents cd JOIN document_types dt ON dt.id = cd.document_type_id WHERE cd.id = $1`,
      [record.renewed_from_id]
    );
    renewedFrom = r[0] || null;
  }
  const { rows: renewedAsRows } = await db.query(
    `SELECT cd.id, cd.document_number, cd.status FROM case_documents cd WHERE cd.renewed_from_id = $1`,
    [record.id]
  );

  res.render('documents/form', {
    title: `Edit — ${record.type_label}`, record, types: null, companies, chemicals, units: null, isNew: false, usedThisYear,
    attachments: attachmentsList, attachmentsBase: `/app/documents/${record.id}/attachments`,
    renewedFrom, renewedAs: renewedAsRows[0] || null, isRenewable: isRenewable(record),
  });
});

// Starts a renewal: creates a fresh case pre-filled from this one (same
// company/chemical/unit/type/activity/quantity), reset to the top of the
// application workflow, linked back via renewed_from_id — so staff don't
// re-key everything from scratch for a company/chemical that's licensed
// year after year. The old case is left exactly as it was (still shows its
// real ISSUED/expired status); only the new one is APPLICATION_RECEIVED.
router.post('/:id/renew', ownedCase, async (req, res) => {
  const source = req.record;
  const { rows } = await db.query(
    `INSERT INTO case_documents
      (document_type_id, unit_id, company_id, chemical_id, activity, quantity, quantity_unit,
       application_date, notes, status, created_by_id, renewed_from_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'APPLICATION_RECEIVED',$10,$11) RETURNING id`,
    [
      source.document_type_id, source.unit_id, source.company_id, source.chemical_id,
      source.activity, source.quantity, source.quantity_unit,
      new Date().toISOString().slice(0, 10),
      source.document_number ? `Renewal of ${source.document_number}.` : `Renewal of case #${source.id}.`,
      req.user.id, source.id,
    ]
  );
  await logAudit(req.user.id, 'CREATE', 'case_documents', rows[0].id, `Renewal of case #${source.id}${source.document_number ? ` (${source.document_number})` : ''}`);
  req.flash('success', 'Renewal case created — pick up the application from here.');
  res.redirect(`/app/documents/${rows[0].id}/edit`);
});

// Attachments (a scanned application, a supporting photo...) for a case —
// see src/lib/attachmentHandlers.js.
router.post('/:id/attachments', ownedCase, upload.single('file'), (req, res) => attachments.upload(req, res));
router.get('/:id/attachments/:attachmentId', ownedCase, (req, res) => attachments.download(req, res));
router.post('/:id/attachments/:attachmentId/delete', ownedCase, (req, res) => attachments.remove(req, res));

router.post('/:id', ownedCase, async (req, res) => {
  const b = req.body;
  const before = req.record;
  const after = {
    company_id: Number(b.company_id), chemical_id: b.chemical_id ? Number(b.chemical_id) : null, activity: b.activity || null,
    quantity: b.quantity ? Number(b.quantity) : null, quantity_unit: b.quantity_unit || null,
    application_date: b.application_date || null, response_date: b.response_date || null, reference_code: b.reference_code || null,
    amount_paid: b.amount_paid ? Number(b.amount_paid) : null, receipt_number: b.receipt_number || null, notes: b.notes || null,
    status: b.status,
  };
  await db.query(
    `UPDATE case_documents SET company_id=$1, chemical_id=$2, activity=$3, quantity=$4, quantity_unit=$5,
       application_date=$6, response_date=$7, reference_code=$8, amount_paid=$9, receipt_number=$10, notes=$11,
       status=$12, updated_at=now()
     WHERE id = $13`,
    [
      after.company_id, after.chemical_id, after.activity, after.quantity, after.quantity_unit,
      after.application_date, after.response_date, after.reference_code, after.amount_paid, after.receipt_number,
      after.notes, after.status, req.params.id,
    ]
  );
  await logAudit(req.user.id, 'UPDATE', 'case_documents', Number(req.params.id), diffForAudit(before, after));
  req.flash('success', 'Case updated.');
  res.redirect('/app/documents');
});

// Issues the document: allocates the next sequential number for its type
// (see src/lib/numbering.js), sets status=ISSUED, date_issued=today, and
// computes expiry_date from the document type's validity rule
// (CALENDAR_YEAR => Dec 31 of the issue year, matching the Chemical
// Management Unit's actual observed convention; ONE_YEAR_FROM_ISSUE =>
// exactly 12 months out; NONE => no expiry).
router.post('/:id/issue', ownedCase, async (req, res) => {
  const record = req.record;
  const { rows: dtRows } = await db.query('SELECT validity FROM document_types WHERE id = $1', [record.document_type_id]);
  const validity = dtRows[0] && dtRows[0].validity;
  if (record.document_number) {
    return res.status(400).render('error', { title: 'Already issued', message: 'This case already has a document number.' });
  }

  const today = new Date();
  const year = today.getFullYear();
  const { number } = await allocateNumber(record.document_type_id, year);

  let expiry = null;
  if (validity === 'CALENDAR_YEAR') expiry = `${year}-12-31`;
  else if (validity === 'ONE_YEAR_FROM_ISSUE') {
    const d = new Date(today); d.setFullYear(d.getFullYear() + 1);
    expiry = d.toISOString().slice(0, 10);
  }

  await db.query(
    `UPDATE case_documents SET document_number=$1, date_issued=$2, expiry_date=$3, status='ISSUED', updated_at=now() WHERE id=$4`,
    [number, today.toISOString().slice(0, 10), expiry, req.params.id]
  );
  await logAudit(req.user.id, 'ISSUE', 'case_documents', Number(req.params.id), `Issued ${number}`);
  req.flash('success', `Issued ${number}.`);
  res.redirect('/app/documents');
});

// A print-friendly rendering of an issued case — the actual deliverable
// this system hands to an applicant company, which previously had no
// output at all beyond a status change in the database.
router.get('/:id/print', ownedCase, async (req, res) => {
  const record = req.record;
  if (!record.document_number) {
    return res.status(400).render('error', { title: 'Not yet issued', message: 'Issue this case first — a printable copy is only available once a document number has been allocated.' });
  }
  const { rows } = await db.query(
    `SELECT cd.*, c.name AS company_name, c.county, c.community, c.street_address,
            dt.label AS type_label, dt.kind AS type_kind, un.name AS unit_name, ch.name AS chemical_name
     FROM case_documents cd
     JOIN companies c ON c.id = cd.company_id
     JOIN document_types dt ON dt.id = cd.document_type_id
     JOIN units un ON un.id = cd.unit_id
     LEFT JOIN chemicals ch ON ch.id = cd.chemical_id
     WHERE cd.id = $1`,
    [req.params.id]
  );
  res.render('documents/print', { title: `${rows[0].document_number}`, record: rows[0], layout: false });
});

router.post('/:id/delete', ownedCase, async (req, res) => {
  if (req.user.role === 'INTERN') return res.status(403).render('error', { title: 'Not allowed', message: 'Interns cannot delete records.' });
  await db.query('DELETE FROM case_documents WHERE id = $1', [req.params.id]);
  await logAudit(req.user.id, 'DELETE', 'case_documents', Number(req.params.id), null);
  req.flash('success', 'Case deleted.');
  res.redirect('/app/documents');
});

module.exports = router;
