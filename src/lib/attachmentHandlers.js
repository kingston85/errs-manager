// Builds the three request handlers (upload / download / delete) shared by
// every place attachments are mounted. `getTable(req)` resolves which table
// this request's attachments belong to (a fixed string for documents.js,
// req.entity.table for generic.js's per-entityKey routes); `redirectTo(req)`
// sends the browser back to the record's edit page after an upload/delete.
const { listAttachments, getAttachment, saveAttachment, deleteAttachment } = require('./attachmentsDb');
const { logAudit } = require('./audit');

function makeAttachmentHandlers({ getTable, redirectTo }) {
  return {
    upload: async (req, res) => {
      const table = getTable(req);
      const id = Number(req.params.id);
      if (!req.file) {
        req.flash('error', 'Choose a file to upload first.');
        return res.redirect(redirectTo(req));
      }
      await saveAttachment({
        table, id,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        buffer: req.file.buffer,
        uploadedById: req.user.id,
      });
      await logAudit(req.user.id, 'ATTACH', table, id, `Uploaded ${req.file.originalname}`);
      req.flash('success', `Uploaded ${req.file.originalname}.`);
      res.redirect(redirectTo(req));
    },

    download: async (req, res) => {
      const table = getTable(req);
      const att = await getAttachment(Number(req.params.attachmentId));
      if (!att || att.entity_table !== table || att.entity_id !== Number(req.params.id)) {
        return res.status(404).render('error', { title: 'Not found', message: 'Attachment not found.' });
      }
      res.setHeader('Content-Type', att.mime_type);
      // 'inline' (not 'attachment') so a PDF or photo opens/previews right
      // in the browser tab — the natural way to look at a scanned document
      // or a site photo — while the browser's own "Save As" still works.
      res.setHeader('Content-Disposition', `inline; filename="${att.filename.replace(/[":]/g, '')}"`);
      res.send(att.content);
    },

    remove: async (req, res) => {
      const table = getTable(req);
      const att = await getAttachment(Number(req.params.attachmentId));
      if (!att || att.entity_table !== table || att.entity_id !== Number(req.params.id)) {
        return res.status(404).render('error', { title: 'Not found', message: 'Attachment not found.' });
      }
      await deleteAttachment(att.id);
      await logAudit(req.user.id, 'DETACH', table, Number(req.params.id), `Removed ${att.filename}`);
      req.flash('success', `Removed ${att.filename}.`);
      res.redirect(redirectTo(req));
    },
  };
}

module.exports = { makeAttachmentHandlers, listAttachments };
