import fs from 'node:fs';
import path from 'node:path';

const SRC = '/tmp/opencode/flash-unique-clean.txt';
const lines = fs
  .readFileSync(SRC, 'utf8')
  .split('\n')
  .map((s) => s.replace(/\s+/g, ' ').trim())
  .filter((s) => s.length >= 4)
  .filter((s, i, a) => a.indexOf(s) === i);

const key = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const body = [
  '<?php',
  '// Auto-generated from verified flash corpus (Phase 3a). mr/hi mirror this key set.',
  'return [',
  ...lines.map((s) => `    '${key(s)}' => '${key(s)}',`),
  '];',
  '',
].join('\n');

fs.mkdirSync('lang/en', { recursive: true });
fs.writeFileSync('lang/en/messages.php', body);

console.log('EN_KEYS=' + lines.length);
