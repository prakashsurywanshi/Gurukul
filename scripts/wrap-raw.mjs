#!/usr/bin/env node
/**
 * wrap-raw.mjs
 *
 * Wraps the remaining UNWRAPPED raw text content in JSX:
 *   1. JSXText children that are visible UI text (buttons, labels, fragments).
 *   2. JSXExpressionContainer children whose expression is a plain StringLiteral.
 *   3. A small allow-list of attribute strings (placeholder/title/aria-label/alt)
 *      known to hold visible copy (QR-code labels, logo preview alt).
 *
 * Guards:
 *   - skip text already inside t()/translate()
 *   - skip Devanagari, URL/email-bearing text, {}/<> template placeholders
 *   - skip WebsiteThemePreviewCard.tsx (design-preview sample copy)
 *   - attribute values other than the allow-list are never touched
 *
 * Keys may start with punctuation (mixed JSX fragments like ". Return to").
 *
 * Usage:
 *   node scripts/wrap-raw.mjs          # dry run (report only)
 *   node scripts/wrap-raw.mjs --apply  # write files
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
const SKIP_FILES = new Set(['WebsiteThemePreviewCard.tsx']);

const URL_SKIP_RE = /(mailto:|tel:|https?:|\/\/|[a-z0-9._-]+@[a-z0-9._-]+)/i;
const TEMPLATE_CHARS_RE = /[{}\[\]<>]/;
const ATTR_TARGETS = new Set([
  'QWA WhatsApp QR code',
  'WhatsApp QR code',
  'School logo preview',
]);

function clean(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function isWrappableText(text) {
  const c = clean(text);
  if (c.length < 2) return false;
  if (!/[A-Za-z]/.test(c)) return false;
  if (/^[\u0900-\u097F]/.test(c)) return false; // Devanagari sample/real content
  if (TEMPLATE_CHARS_RE.test(c)) return false;   // braces/brackets = placeholders/markup
  if (URL_SKIP_RE.test(c)) return false;
  return true;
}

function collectFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      out.push(...collectFiles(full));
    } else if (entry.name.endsWith('.tsx')) {
      if (SKIP_FILES.has(entry.name)) continue;
      out.push(full);
    }
  }
  return out;
}

function isAlreadyInT(start) {
  let p = start;
  while (p && !p.isProgram()) {
    if (p.isCallExpression() && p.node.callee && (p.node.callee.name === 't' || p.node.callee.name === 'translate')) {
      return true;
    }
    p = p.parentPath;
  }
  return false;
}

function importSpecifierFor(fileDir) {
  const rel = path.relative(fileDir, path.join(ROOT, 'i18n', 'LanguageProvider')).split(path.sep).join('/');
  return rel.startsWith('.') ? rel : './' + rel;
}

function run(file) {
  const dir = path.dirname(file);
  const source = fs.readFileSync(file, 'utf8');
  const result = { file, changed: false, wraps: 0, hook: false, keys: [] };

  if (!source.trim()) return result;

  let ast;
  try {
    ast = parse(source, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
  } catch {
    result.warn = 'PARSE ERROR — skipped';
    return result;
  }

  let hookId = 't';
  traverse(ast, {
    Program(prog) {
      if (prog.scope.hasBinding('t')) hookId = 'translate';
    },
  });

  const keys = new Set();
  let wraps = 0;

  const wrapText = (path_, replacementNode) => {
    if (isAlreadyInT(path_)) return false;
    keys.add(clean(replacementNode.value));
    wraps++;
    return t.jsxExpressionContainer(t.callExpression(t.identifier(hookId), [t.stringLiteral(clean(replacementNode.value))]));
  };

  traverse(ast, {
    JSXElement(nodePath) {
      nodePath.node.children.forEach((child, idx) => {
        if (t.isJSXText(child)) {
          const c = clean(child.value);
          if (!isWrappableText(c)) return;
          const replacement = wrapText(nodePath, { value: c });
          if (replacement) nodePath.node.children[idx] = replacement;
        } else if (t.isJSXExpressionContainer(child)) {
          const e = child.expression;
          if (t.isStringLiteral(e)) {
            const c = clean(e.value);
            if (!isWrappableText(c)) return;
            if (isAlreadyInT(nodePath)) return;
            keys.add(c);
            wraps++;
            nodePath.node.children[idx] = t.jsxExpressionContainer(
              t.callExpression(t.identifier(hookId), [t.stringLiteral(c)]),
            );
          }
        }
      });
    },
    JSXFragment(nodePath) {
      nodePath.node.children.forEach((child, idx) => {
        if (t.isJSXText(child)) {
          const c = clean(child.value);
          if (!isWrappableText(c)) return;
          const replacement = wrapText(nodePath, { value: c });
          if (replacement) nodePath.node.children[idx] = replacement;
        } else if (t.isJSXExpressionContainer(child)) {
          const e = child.expression;
          if (t.isStringLiteral(e)) {
            const c = clean(e.value);
            if (!isWrappableText(c)) return;
            if (isAlreadyInT(nodePath)) return;
            keys.add(c);
            wraps++;
            nodePath.node.children[idx] = t.jsxExpressionContainer(
              t.callExpression(t.identifier(hookId), [t.stringLiteral(c)]),
            );
          }
        }
      });
    },
    JSXAttribute(nodePath) {
      const name = nodePath.node.name && nodePath.node.name.name;
      if (!['placeholder', 'title', 'aria-label', 'alt'].includes(name)) return;
      const value = nodePath.node.value;
      if (!value || !t.isStringLiteral(value)) return;
      const c = clean(value.value);
      if (!ATTR_TARGETS.has(c)) return;
      if (isAlreadyInT(nodePath)) return;
      keys.add(c);
      wraps++;
      nodePath.node.value = t.jsxExpressionContainer(t.callExpression(t.identifier(hookId), [t.stringLiteral(c)]));
    },
  });

  result.keys = [...keys];
  result.wraps = wraps;
  if (result.wraps === 0) return result;

  const hasLanguageImport = ast.program.body.some(
    (d) => t.isImportDeclaration(d) && String(d.source.value).includes('i18n/LanguageProvider'),
  );

  if (!hasLanguageImport) {
    let target = null;
    traverse(ast, {
      ExportDefaultDeclaration(p) {
        const d = p.node.declaration;
        if (t.isFunctionDeclaration(d) || t.isArrowFunctionExpression(d)) {
          target = { node: d };
          p.stop();
          return;
        }
        if (t.isIdentifier(d)) {
          const binding = p.scope.getBinding(d.name);
          if (binding) {
            if (binding.path.isFunctionDeclaration()) target = { node: binding.path.node };
            else if (binding.path.isVariableDeclarator()) {
              const init = binding.path.node.init;
              if (t.isArrowFunctionExpression(init)) target = { node: init };
            }
          }
          p.stop();
          return;
        }
      },
    });
    if (!target) {
      traverse(ast, {
        ExportNamedDeclaration(p) {
          if (target) { p.skip(); return; }
          const d = p.node.declaration;
          if (t.isFunctionDeclaration(d)) target = { node: d };
          else if (t.isVariableDeclaration(d) && d.declarations.length === 1) {
            const init = d.declarations[0].init;
            if (t.isArrowFunctionExpression(init)) target = { node: init };
          }
        },
      });
    }

    if (target) {
      const hookStmt = t.variableDeclaration('const', [
        t.variableDeclarator(
          t.objectPattern([t.objectProperty(t.identifier(hookId), t.identifier(hookId), false, true)]),
          t.callExpression(t.identifier('useLanguage'), []),
        ),
      ]);
      if (t.isArrowFunctionExpression(target.node) && !t.isBlockStatement(target.node.body)) {
        target.node.body = t.blockStatement([hookStmt, t.returnStatement(target.node.body)]);
        result.hook = true;
      } else if (t.isBlockStatement(target.node.body)) {
        target.node.body.body.unshift(hookStmt);
        result.hook = true;
      }
    } else {
      result.warn = 'wrapped text but no component export found to receive the hook';
    }

    ast.program.body.unshift(
      t.importDeclaration(
        [t.importSpecifier(t.identifier('useLanguage'), t.identifier('useLanguage'))],
        t.stringLiteral(importSpecifierFor(dir)),
      ),
    );
  }

  const { code } = generate(ast, { retainLines: true, comments: true, jsescOption: { minimal: true } }, source);
  result.changed = code !== source && result.wraps > 0;
  result.code = code;

  return result;
}

// ---- CLI ----
const roots = [path.join(ROOT, 'Pages'), path.join(ROOT, 'components')];
const files = roots.flatMap(collectFiles);

let totalWraps = 0;
const changed = [];
const allKeys = new Set();
const warnings = [];

for (const file of files) {
  const r = run(file);
  if (r.wraps === 0) continue;
  r.keys.forEach((k) => allKeys.add(k));
  totalWraps += r.wraps;
  if (r.changed) changed.push(r);
  if (r.warn) warnings.push({ file: r.file, warn: r.warn });
}

console.log(`Scanned ${files.length} .tsx files (Pages + components; excluding ui/website/figma).`);
console.log(`Unwrapped raw text wrapped: ${totalWraps} across ${changed.length} files  |  unique keys: ${allKeys.size}`);

if (!APPLY) {
  console.log('\nDRY RUN — pass --apply to write. Files to change:');
  for (const r of changed.slice(0, 80)) {
    console.log(`  +${String(r.wraps).padStart(3)}  ${path.relative(process.cwd(), r.file)}${r.hook ? '  [hook]' : ''}`);
  }
  if (changed.length > 80) console.log(`  ...and ${changed.length - 80} more`);
} else {
  let n = 0;
  for (const r of changed) {
    if (r.code) { fs.writeFileSync(r.file, r.code); n++; }
  }
  console.log(`Applied changes to ${n} files.`);
}

if (warnings.length) {
  console.log(`\nWARN: wrapped files missing an injectable hook (${warnings.length}):`);
  for (const w of warnings) console.log(`  ${path.relative(process.cwd(), w.file)} :: ${w.warn}`);
}

const keysOut = path.resolve('storage/app/sync-chunks/raw-keys.json');
if (allKeys.size) {
  fs.mkdirSync(path.dirname(keysOut), { recursive: true });
  fs.writeFileSync(keysOut, JSON.stringify([...allKeys].sort(), null, 2));
  console.log(`Wrote ${allKeys.size} skeleton keys to ${keysOut}`);
}