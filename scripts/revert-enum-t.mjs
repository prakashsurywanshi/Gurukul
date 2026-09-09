#!/usr/bin/env node
/**
 * revert-enum-t.mjs
 *
 * Fixes a pre-existing wrap-ui regression: component prop VALUES that are data
 * enums got wrapped in t() (e.g. `variant={cond ? t('default') : t('secondary')}`,
 * `type={x ? t('button') : t('submit')}`). In non-English locales t() returns a
 * translated word, which is an INVALID enum for the prop — breaking Badge/Button
 * variants, input types, etc.
 *
 * This script rewrites ONLY attribute-value expression containers: any branch of
 * a conditional/logical expression inside an attribute value that is a
 * t('<known enum>') call is reverted to the raw string literal.
 *
 * Usage:
 *   node scripts/revert-enum-t.mjs          # dry run
 *   node scripts/revert-enum-t.mjs --apply  # write files
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

const ROOT = path.resolve('resources/js');
const SKIP_DIRS = new Set(['ui', 'website', 'figma']);

// Prop-value enums that must NOT be translated.
const ENUM_TOKENS = new Set([
  'default', 'outline', 'secondary', 'primary', 'destructive', 'danger',
  'success', 'warning', 'info', 'ghost', 'soft', 'solid', 'light', 'dark',
  'filled', 'tinted', 'external',
  'button', 'submit', 'reset', 'text', 'tel', 'email', 'number', 'select',
  'radio', 'checkbox', 'file', 'date', 'search', 'url', 'password', 'hidden',
  'inline', 'block', 'page', 'modal', 'full', 'small', 'medium', 'large',
]);

function collectFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      out.push(...collectFiles(full));
    } else if (entry.name.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

function isTEnumCall(node) {
  if (!t.isCallExpression(node)) return false;
  const callee = node.callee;
  const name = t.isIdentifier(callee) ? callee.name : (t.isMemberExpression(callee) && !callee.computed ? callee.property.name : null);
  if (name !== 't' && name !== 'translate') return false;
  if (node.arguments.length === 1 && t.isStringLiteral(node.arguments[0])) {
    return ENUM_TOKENS.has(node.arguments[0].value);
  }
  return false;
}

function hasTEnum(node) {
  if (isTEnumCall(node)) return true;
  if (t.isConditionalExpression(node)) return hasTEnum(node.consequent) || hasTEnum(node.alternate);
  if (t.isLogicalExpression(node)) return hasTEnum(node.left) || hasTEnum(node.right);
  return false;
}

function run(file) {
  const source = fs.readFileSync(file, 'utf8');
  const result = { file, changed: false, reverts: 0 };

  let ast;
  try {
    ast = parse(source, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
  } catch {
    return result;
  }

  traverse(ast, {
    JSXAttribute(nodePath) {
      const value = nodePath.node.value;
      if (!value || !t.isJSXExpressionContainer(value)) return;
      const expr = value.expression;
      if (!hasTEnum(expr)) return;

      const revert = (n) => {
        if (isTEnumCall(n)) {
          result.reverts++;
          return t.stringLiteral(n.arguments[0].value);
        }
        if (t.isConditionalExpression(n)) {
          n.consequent = revert(n.consequent);
          n.alternate = revert(n.alternate);
        } else if (t.isLogicalExpression(n)) {
          n.left = revert(n.left);
          n.right = revert(n.right);
        }
        return n;
      };

      value.expression = revert(expr);
    },
  });

  if (result.reverts === 0) return result;

  const { code } = generate(ast, { retainLines: true, comments: true, jsescOption: { minimal: true } }, source);
  result.changed = code !== source;
  result.code = code;
  return result;
}

const files = [path.join(ROOT, 'Pages'), path.join(ROOT, 'components')].flatMap(collectFiles);

let total = 0;
const changed = [];

for (const file of files) {
  const r = run(file);
  if (r.reverts === 0) continue;
  total += r.reverts;
  if (r.changed) changed.push(r);
}

console.log(`Scanned ${files.length} .tsx files.`);
console.log(`Enum t() reverts found: ${total} across ${changed.length} files.`);

if (!APPLY) {
  console.log('\nDRY RUN — pass --apply to write.');
  for (const r of changed.slice(0, 50)) {
    console.log(`  +${String(r.reverts).padStart(3)}  ${path.relative(process.cwd(), r.file)}`);
  }
  if (changed.length > 50) console.log(`  ...and ${changed.length - 50} more`);
} else {
  let n = 0;
  for (const r of changed) {
    if (r.code) { fs.writeFileSync(r.file, r.code); n++; }
  }
  console.log(`Applied to ${n} files.`);
}