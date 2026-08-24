// CSRF protection using the Synchronizer Token Pattern (csrf-sync), which
// pairs naturally with express-session — the token lives in req.session,
// no separate cookie needed. This app is plain server-rendered forms (no
// SPA/fetch layer), so getTokenFromRequest reads the hidden `_csrf` field
// every POST form now carries, rather than the package's SPA-oriented
// default of an `x-csrf-token` header.
const { csrfSync } = require('csrf-sync');

const {
  csrfSynchronisedProtection,
  generateToken,
  invalidCsrfTokenError,
} = csrfSync({
  getTokenFromRequest: (req) => req.body && req.body._csrf,
});

module.exports = { csrfSynchronisedProtection, generateToken, invalidCsrfTokenError };
