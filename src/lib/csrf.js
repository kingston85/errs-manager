// CSRF protection using the Synchronizer Token Pattern (csrf-sync), which
// pairs naturally with express-session — the token lives in req.session,
// no separate cookie needed. This app is plain server-rendered forms (no
// SPA/fetch layer), so getTokenFromRequest reads the hidden `_csrf` field
// every POST form now carries, rather than the package's SPA-oriented
// default of an `x-csrf-token` header.
//
// Multipart forms (file uploads — CSV import, attachments) are a special
// case: this middleware is mounted globally, before any route, which means
// it runs before multer parses the multipart body — so req.body._csrf is
// always empty for those requests no matter what the form sends, and every
// upload would 403. multer/busboy do parse the query string up front
// though, so those forms' actions carry the token as ?_csrf=... instead;
// this checks both.
const { csrfSync } = require('csrf-sync');

const {
  csrfSynchronisedProtection,
  generateToken,
  invalidCsrfTokenError,
} = csrfSync({
  getTokenFromRequest: (req) => (req.body && req.body._csrf) || req.query._csrf,
});

module.exports = { csrfSynchronisedProtection, generateToken, invalidCsrfTokenError };
