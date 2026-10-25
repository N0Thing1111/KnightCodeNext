import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const path = fileURLToPath(new URL('../.env.local', import.meta.url));
let content = existsSync(path) ? readFileSync(path, 'utf8') : '';
let added = 0;
for (const name of ['CRON_SECRET', 'AUTOMATIC_BACKUP_SECRET']) {
  const expression = new RegExp('^' + name + '=([^\\r\\n]*)', 'm');
  const match = content.match(expression);
  if (match && match[1].trim().replace(/^['"]|['"]$/g, '').length >= 32) continue;
  if (match && match[1].trim()) throw Error(name + ' already has a value. Check it manually; this script never replaces an existing secret.');
  const line = name + '=' + randomBytes(32).toString('hex');
  content = match ? content.replace(expression, line) : content + '\n' + line + '\n';
  added++;
}
if (added) writeFileSync(path, content, { mode: 0o600 });
console.log(added ? 'Created missing secrets in .env.local. No values were printed.' : 'Both secrets already exist; neither was changed.');
console.log('Copy each value into the matching Vercel Production environment variable, then deploy. Keep the encryption secret securely; old stored backups require it.');
