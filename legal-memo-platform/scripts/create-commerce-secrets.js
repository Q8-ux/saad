'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const target = path.join(__dirname, '..', '.env.commerce.generated');
const contents = [
  'SABEQ_ENCRYPTION_KEY=' + crypto.randomBytes(32).toString('base64'),
  'SABEQ_ADMIN_BOOTSTRAP_SECRET=' + crypto.randomBytes(32).toString('hex'),
  '',
].join('\n');
// Exclusive creation prevents accidental replacement of a key protecting existing data.
fs.writeFileSync(target, contents, { flag: 'wx', mode: 0o600 });
console.log('Generated two secrets in .env.commerce.generated (ignored by git). Copy them securely to your server environment; values are not printed.');
