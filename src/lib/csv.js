// Thin CSV helpers shared by every "download as spreadsheet" / "bulk
// import" feature — the department's own workflow was Excel-based before
// this app existed, and the app previously offered no way back out to that
// format at all.
const { stringify } = require('csv-stringify/sync');
const { parse } = require('csv-parse/sync');

function sendCsv(res, filename, rows, columns) {
  const csv = stringify(rows, { header: true, columns });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

function parseCsv(buffer) {
  return parse(buffer, { columns: true, skip_empty_lines: true, trim: true });
}

module.exports = { sendCsv, parseCsv };
