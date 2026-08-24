// Password policy, applied identically whether an account is being created
// or having its password reset — previously only the create route checked
// anything, and even then just a 6-character minimum.
const MIN_LENGTH = 10;

// A short, checked-in list of the passwords guaranteed to be floating
// around this specific deployment (the seeded demo password chief among
// them) plus a few generic throwaways. This is not a breached-password
// database — see README for the recommended HaveIBeenPwned range-query
// upgrade — but it costs nothing and closes the most likely real mistake:
// someone "changing" the password to the same demo password everyone was
// told to rotate away from.
const BLOCKLIST = new Set([
  'welcome@2026',
  'password',
  'password1',
  'password123',
  '12345678',
  '123456789',
  'qwerty123',
  'changeme',
  'letmein',
]);

function checkPasswordStrength(plain) {
  const value = plain || '';
  if (value.length < MIN_LENGTH) {
    return `Password must be at least ${MIN_LENGTH} characters.`;
  }
  if (BLOCKLIST.has(value.toLowerCase())) {
    return 'That password is too common (it includes the shared demo password) — choose a different one.';
  }
  const varietyCount = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) => re.test(value)).length;
  if (varietyCount < 2) {
    return 'Password should mix at least two of: lowercase, uppercase, numbers, symbols.';
  }
  return null; // null = passes
}

module.exports = { checkPasswordStrength, MIN_LENGTH };
