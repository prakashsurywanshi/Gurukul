#!/usr/bin/env node
/**
 * repair-mixed.mjs
 *
 * Undoes the over-eager wraps that extract-mixed.mjs produced under its original
 * filter. Any `t('KEY')` whose KEY begins with `/` (route/URL) or with non
 * alphanumerics (punctuation-led continuation fragments such as "- Section",
 * "| Date:", "). Click") is unwrapped back to the plain string literal.
 *
 *   {isSuperAdmin ? t("/superadmin/profile") : t("/profile")}
 *     ->  {isSuperAdmin ? "/superadmin/profile" : "/profile"}
 *
 * Usage:
 *   node scripts/repair-mixed.mjs      # dry run
 *   node scripts/repair-mixed.mjs --apply
 */

import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import travModule from '@babel/traverse';
import genModule from '@babel/generator';
import * as t from '@babel/types';

const traverse = travModule.default ?? travModule;
const generate = genModule.default ?? genModule;

const ARGS = process.argv.slice(2);
const APPLY = ARGS.includes('--apply');

const ROOT = path.resolve('resources/js/Pages');
const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) walk(path.join(d, e.name));
    else if (e.name.endsWith('.tsx')) files.push(path.join(d, e.name));
  }
};
walk(ROOT);

const isBad = (s) => /^\/|^[^A-Za-z0-9]/.test(s) || s.startsWith('__');

const changed = [];
let unwrapped = 0;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parse(src, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
  } catch {
    continue;
  }

  let localCount = 0;
  traverse(ast, {
    CallExpression(p) {
      const callee = p.node.callee;
      if (!callee || (callee.name !== 't' && callee.name !== 'translate')) return;
      const args = p.node.arguments;
      if (args.length !== 1 || !t.isStringLiteral(args[0])) return;
      if (!isBad(args[0].value)) return;
      // Only unwrap top-level t('KEY') expressions (inside JSX or expressions),
      // never t() already nested inside strings.
      p.replaceWith(t.stringLiteral(args[0].value));
      localCount += 1;
    },
  });

  if (localCount === 0) continue;
  const { code } = generate(ast, { retainLines: true, comments: true, jsescOption: { minimal: true } }, src);
  if (code === src) continue;
  changed.push({ file, count: localCount });
  unwrapped += localCount;
  if (APPLY) fs.writeFileSync(file, code);
}

console.log(`${APPLY ? 'Unwrapped' : 'WOULD unwrap'} ${unwrapped} over-wrapped strings across ${changed.length} files.`);
for (const c of changed.slice(0, 40)) {
  console.log(`  -${String(c.count).padStart(3)}  ${path.relative(process.cwd(), c.file)}`);
}
if (changed.length > 40) console.log(`  ...and ${changed.length - 40} more`);