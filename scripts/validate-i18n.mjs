import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dictDir = path.join(root, 'resources', 'js', 'i18n');

const re = /(?<label>^\s*)(?:(?<q>['"])(?<key>(?:\\.|(?!\k<q>)[\s\S])*)\k<q>|(?<key2>[A-Za-z_$][A-Za-z0-9_$]*))\s*:\s*(?<q2>['"])(?<val>(?:\\.|(?!\k<q2>)[\s\S])*)\k<q2>\s*,\s*$/gm;

function load(lang) {
  const file = path.join(dictDir, `${lang}.ts`);
  const src = fs.readFileSync(file, 'utf8');
  const entries = {};
  for (const m of src.matchAll(re)) entries[m.groups.key ?? m.groups.key2] = { val: m.groups.val, label: m.groups.label };
  return { file, src, entries };
}

let exit = 0;
const langs = ['en', 'mr', 'hi'];

for (const lang of langs) {
  const { file, src, entries } = load(lang);
  const keys = Object.keys(entries);
  const bad = [];
  const englishFallbacks = [];
  for (const k of keys) {
    const v = entries[k].val;
    const hasBad = /(?:\\n|<|>)/.test(v) || k.length > 200;
    if (hasBad) bad.push(k);
    if (lang !== 'en' && v === k) englishFallbacks.push(k);
  }
  const interp = keys.filter((k) => k.includes('{'));
  console.log(`[${lang}] ${keys.length} keys | ${interp.length} interpolated | ${bad.length} bad | ${lang === 'en' ? '-' : englishFallbacks.length + ' English fallbacks'}`);
  if (bad.length) { console.log('  BAD:', bad.join(' | ')); exit = 1; }
  if (lang !== 'en' && englishFallbacks.length) console.log('  fallback samples:', englishFallbacks.slice(0, 12).join(' | '));
  if (interp.length && lang !== 'en') {
    const missing = interp.filter((k) => {
      const placeholders = [...k.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
      return placeholders.some((p) => !entries[k].val.includes(`{${p}}`));
    });
    if (missing.length) { console.log('  missing placeholders:', missing.join(' | ')); exit = 1; }
  }
}

process.exit(exit);