// Public license/certificate verification — no login required. Lets anyone
// (a bank, another government office, a member of the public) confirm that
// a License, Clearance, Certificate, or Bill this department issued is
// genuine and see its current status, instead of having no way to check
// except calling the department directly. Mounted at /verify, before
// requireAuth (see src/server.js), same pattern as /internal.
//
// Deliberately only ever surfaces cases that have a document_number — that
// column is only set once a case is actually ISSUED (src/routes/documents.js
// #issue), so a pending or rejected application is never reachable here.
// Only the minimum needed to confirm authenticity is shown: no internal
// ids, no applicant contact details, no notes/findings.
const express = require('express');
const router = express.Router();
const db = require('../lib/db');

const SELECT = `SELECT cd.document_number, cd.status, cd.date_issued, cd.expiry_date, cd.activity,
                       c.name AS company_name, dt.label AS type_label, dt.kind AS type_kind, un.name AS unit_name,
                       ch.name AS chemical_name
                FROM case_documents cd
                JOIN companies c ON c.id = cd.company_id
                JOIN document_types dt ON dt.id = cd.document_type_id
                JOIN units un ON un.id = cd.unit_id
                LEFT JOIN chemicals ch ON ch.id = cd.chemical_id`;

// A document is only "currently valid" if it was actually issued (not
// later marked EXPIRED/REJECTED by staff) and, when it has an expiry date,
// that date hasn't passed yet.
function verdictFor(row) {
  if (row.status !== 'ISSUED') return { valid: false, label: row.status === 'EXPIRED' ? 'Expired' : 'Not currently valid' };
  if (row.expiry_date && new Date(row.expiry_date) < new Date()) return { valid: false, label: 'Expired' };
  return { valid: true, label: 'Valid' };
}

router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim();
  let results = [];
  if (q) {
    const { rows } = await db.query(
      `${SELECT} WHERE cd.document_number IS NOT NULL
       AND (cd.document_number ILIKE $1 OR c.name ILIKE $1)
       ORDER BY cd.date_issued DESC LIMIT 25`,
      [`%${q}%`]
    );
    results = rows.map((r) => ({ ...r, verdict: verdictFor(r) }));
  }
  res.render('verify', { title: 'Verify a License or Certificate', layout: false, q, results, searched: q.length > 0 });
});

module.exports = router;
