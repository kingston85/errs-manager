// Shared multer config for file attachments (src/routes/generic.js and
// src/routes/documents.js both mount an upload route using this). Kept to
// one file so the size limit and allowed types are defined once.
const multer = require('multer');

// 8MB comfortably covers a phone photo or a scanned multi-page PDF while
// staying well inside what Neon's free tier (0.5GB) and Render's free
// request-body limits can handle without a second thought.
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

// Deliberately restricted to what this department actually attaches —
// scanned applications/certificates (PDF, or a photographed page as an
// image) and site/inspection photos — rather than accepting arbitrary
// file types from an authenticated-but-not-necessarily-careful upload form.
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error(`"${file.mimetype}" isn't an accepted file type. Upload a PDF, JPEG, PNG, WEBP, or HEIC file.`));
    }
    cb(null, true);
  },
});

module.exports = { upload, MAX_ATTACHMENT_BYTES, ALLOWED_MIME_TYPES };
