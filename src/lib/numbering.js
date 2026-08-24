// Sequential per-type document numbering, mirroring the Chemical Management
// Unit's existing real-world convention observed in their Excel workbook's
// "License_Numbers" tab: numbers are pre-allocated in an annual block per
// document type (that sheet had exactly 180 slots each for three license
// types), not generated ad hoc. Here the "block" isn't a hard technical
// limit — it's tracked as an expectation (documentType.block_size) shown in
// the UI ("42 of 180 issued this year") so staff notice if a unit is about
// to exceed its usual annual allotment, without ever blocking a real license
// from being issued.
const db = require('./db');

// Allocates (and durably reserves) the next number for a document type in a
// given year, formatted using that type's prefix/suffix/padding. Wrapped in
// a transaction with a row lock so two simultaneous issuances never get the
// same number.
async function allocateNumber(documentTypeId, year) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: dtRows } = await client.query('SELECT * FROM document_types WHERE id = $1', [documentTypeId]);
    const dt = dtRows[0];
    if (!dt) throw new Error('Unknown document type');

    await client.query(
      `INSERT INTO number_allocators (document_type_id, year, next_seq)
       VALUES ($1, $2, 1)
       ON CONFLICT (document_type_id, year) DO NOTHING`,
      [documentTypeId, year]
    );
    const { rows: allocRows } = await client.query(
      `SELECT * FROM number_allocators WHERE document_type_id = $1 AND year = $2 FOR UPDATE`,
      [documentTypeId, year]
    );
    const alloc = allocRows[0];
    const seq = alloc.next_seq;
    await client.query(
      `UPDATE number_allocators SET next_seq = next_seq + 1 WHERE id = $1`,
      [alloc.id]
    );
    await client.query('COMMIT');

    const padded = String(seq).padStart(dt.number_padding, '0');
    const formatted = `${dt.number_prefix}${padded}${dt.number_suffix.replace('{year}', String(year))}`;
    return { number: formatted, seq, blockSize: dt.block_size };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// How many of this type's annual block have been used so far this year —
// purely informational, for the "42 of 180 issued this year" UI hint.
async function usageThisYear(documentTypeId, year) {
  const { rows } = await db.query(
    `SELECT next_seq - 1 AS used FROM number_allocators WHERE document_type_id = $1 AND year = $2`,
    [documentTypeId, year]
  );
  return rows[0] ? rows[0].used : 0;
}

module.exports = { allocateNumber, usageThisYear };
