'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const PRIVATE_ROOT = path.resolve(__dirname, process.env.PRIVATE_CASE_UPLOAD_DIR || 'private-case-files');
const MAX_FILE_BYTES = Number(process.env.PRIVATE_CASE_MAX_FILE_MB || 25) * 1024 * 1024;
const MAX_FILES = Number(process.env.PRIVATE_CASE_MAX_FILES || 25);
const ALLOWED = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

function ensurePrivateRoot() {
  fs.mkdirSync(PRIVATE_ROOT, { recursive: true, mode: 0o700 });
  try { fs.chmodSync(PRIVATE_ROOT, 0o700); } catch {}
}

function safeExtension(file) {
  const ext = path.extname(String(file.originalname || '')).toLowerCase();
  return /^[.][a-z0-9]{1,8}$/.test(ext) ? ext : '';
}

function caseDirectory(userId, caseId) {
  const dir = path.join(PRIVATE_ROOT, crypto.createHash('sha256').update(String(userId)).digest('hex').slice(0, 20), String(caseId));
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  try { fs.chmodSync(dir, 0o700); } catch {}
  return dir;
}

function storage() {
  ensurePrivateRoot();
  return {
    destination(req, _file, cb) {
      if (!req.session?.userId || !req.params?.id) return cb(new Error('تعذر تحديد مالك الملف أو القضية'));
      cb(null, caseDirectory(req.session.userId, req.params.id));
    },
    filename(_req, file, cb) {
      cb(null, crypto.randomUUID() + safeExtension(file));
    },
  };
}

function fileFilter(_req, file, cb) {
  if (!ALLOWED.has(String(file.mimetype || '').toLowerCase())) {
    return cb(new Error('نوع الملف غير مدعوم. المسموح: PDF وDOCX وTXT وJPG وPNG.'));
  }
  cb(null, true);
}

function resolvePrivateFile(userId, caseId, storedName) {
  const base = caseDirectory(userId, caseId);
  const target = path.resolve(base, path.basename(storedName));
  if (!target.startsWith(base + path.sep)) throw new Error('مسار ملف غير صالح');
  return target;
}

function removePrivateFile(userId, caseId, storedName) {
  try { fs.unlinkSync(resolvePrivateFile(userId, caseId, storedName)); } catch {}
}

module.exports = {
  PRIVATE_ROOT,
  MAX_FILE_BYTES,
  MAX_FILES,
  storage,
  fileFilter,
  resolvePrivateFile,
  removePrivateFile,
};
