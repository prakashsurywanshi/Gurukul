#!/usr/bin/env node
/**
 * wrap-ui.mjs
 *
 * Wraps the remaining unwrapped *display* strings identified by the i18n audit:
 *
 *   Pass A (render wrap): translate variable-driven display values at their
 *   render site. JSX text-position expression containers whose expression is a
 *   member expression on a known display field get wrapped in t():
 *       style-labeled fields:  label, title, description
 *       enum fields:           status, gender, role, category, type, purpose,
 *                              priority, payment_method, leave_type, grade,
 *                              blood_group, religion, caste, result, mode
 *     `{row.status}`            -> `{t(row.status)}`
 *     `{item.label}`            -> `{t(item.label)}`
 *     `{t(row.grade)}`          -> untouched (already wrapped)
 *     `{cert.section}`          -> untouched (section excluded deliberately)
 *     `value={row.status}`      -> untouched (attribute/binding, not text)
 *
 *   Pass B (key gather): collect every wrappable string literal that sits in a
 *   `label:`, `title:` or `description:` property into a keys file, so the
 *   dictionaries can be populated for the variable `t(...)` renders added in
 *   Pass A. Literals are NOT modified here (only render sites are wrapped).
 *
 * Safe by construction: only text-position children of JSX elements/fragments
 * are touched, never attribute values, binding expressions, or logic.
 *
 * Auto-injects `useLanguage` + `const { t } = useLanguage();` into files that
 * gained wrapped strings (same approach as the other codemods).
 *
 * Usage:
 *   node scripts/wrap-ui.mjs             # dry run (report only)
 *   node scripts/wrap-ui.mjs --apply     # write files
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

const ENUM_FIELDS = new Set([
  'status', 'gender', 'role', 'category', 'type', 'purpose', 'priority',
  'payment_method', 'leave_type', 'grade', 'blood_group', 'religion', 'caste',
  'result', 'mode',
]);
const LABEL_FIELDS = new Set(['label', 'title', 'description']);
const WRAPPABLE_FIELDS = new Set([...ENUM_FIELDS, ...LABEL_FIELDS]);

const KEY_SKIP_RE = /^[^A-Za-z]*$/;
const URL_SKIP_RE = /(mailto:|tel:|https?:|\/\/|[a-z0-9._-]+@[a-z0-9._-]+)/i;

function isWrappableString(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length < 2) return false;
  if (KEY_SKIP_RE.test(clean)) return false;
  if (URL_SKIP_RE.test(clean)) return false;
  if (/^[\u0900-\u097F]/.test(clean)) return false;
  if (!/^[A-Za-z0-9]/.test(clean)) return false;
  if (/^[0-9]+$/.test(clean)) return false;
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
      out.push(full);
    }
  }
  return out;
}

function isAlreadyT(expr) {
  return t.isCallExpression(expr) && expr.callee &&
    (expr.callee.name === 't' || expr.callee.name === 'translate');
}

function enclosingT(nodePath, start) {
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

  // ---- Pass B: gather wrappable label/title/description literals ----------
  traverse(ast, {
    ObjectProperty(p) {
      const keyName = p.node.key && (p.node.key.name || p.node.key.value);
      if (!LABEL_FIELDS.has(keyName)) return;
      const val = p.node.value;
      if (!t.isStringLiteral(val)) return;
      if (!isWrappableString(val.value)) return;
      if (enclosingT(p, p.parentPath)) return;
      keys.add(val.value);
    },
  });

  // ---- Pass A: wrap text-position rendering of display fields -------------
  const wrapped = [];

  traverse(ast, {
    JSXElement(nodePath) {
      const el = nodePath.node;
      el.children.forEach((child) => {
        if (!t.isJSXExpressionContainer(child)) return;
        const e = child.expression;
        if (!t.isMemberExpression(e)) return;
        if (!e.computed && e.property && e.property.name && WRAPPABLE_FIELDS.has(e.property.name)) {
          if (isAlreadyT(e)) return;
          if (enclosingT(nodePath, nodePath)) return;
          child.expression = t.callExpression(t.identifier(hookId), [e]);
          wrapped.push(e.property.name);
        }
      });
    },

    JSXFragment(nodePath) {
      const frag = nodePath.node;
      frag.children.forEach((child) => {
        if (!t.isJSXExpressionContainer(child)) return;
        const e = child.expression;
        if (!t.isMemberExpression(e)) return;
        if (!e.computed && e.property && e.property.name && WRAPPABLE_FIELDS.has(e.property.name)) {
          if (isAlreadyT(e)) return;
          if (enclosingT(nodePath, nodePath)) return;
          child.expression = t.callExpression(t.identifier(hookId), [e]);
          wrapped.push(e.property.name);
        }
      });
    },
  });

  result.keys = [...keys];
  result.wraps = wrapped.length;
  if (result.wraps === 0 && result.keys.length === 0) return result;

  const needsHook = result.wraps > 0;
  const hasLanguageImport = ast.program.body.some(
    (d) => t.isImportDeclaration(d) && String(d.source.value).includes('i18n/LanguageProvider')
  );

  if (needsHook && !hasLanguageImport) {
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
          t.callExpression(t.identifier('useLanguage'), [])
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
      result.warn = 'wrapped render sites but no component export found to receive the hook';
    }

    ast.program.body.unshift(
      t.importDeclaration(
        [t.importSpecifier(t.identifier('useLanguage'), t.identifier('useLanguage'))],
        t.stringLiteral(importSpecifierFor(dir))
      )
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
  if (r.wraps === 0 && r.keys.length === 0) continue;
  r.keys.forEach((k) => allKeys.add(k));
  totalWraps += r.wraps;
  if (r.wraps > 0 && r.changed) changed.push(r);
  if (r.warn) warnings.push({ file: r.file, warn: r.warn });
}

console.log(`Scanned ${files.length} .tsx files (Pages + components; excluding ui/website/figma).`);
console.log(`Render sites wrapped: ${totalWraps} across ${changed.length} files  |  literal keys gathered: ${allKeys.size}`);

if (!APPLY) {
  console.log('\nDRY RUN — pass --apply to write. Files to change:');
  for (const r of changed.slice(0, 60)) {
    console.log(`  +${String(r.wraps).padStart(3)}  ${path.relative(process.cwd(), r.file)}${r.hook ? '  [hook]' : ''}`);
  }
  if (changed.length > 60) console.log(`  ...and ${changed.length - 60} more`);
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

const keysOut = path.resolve('storage/app/sync-chunks/ui-keys.json');
if (allKeys.size) {
  fs.mkdirSync(path.dirname(keysOut), { recursive: true });
  fs.writeFileSync(keysOut, JSON.stringify([...allKeys].sort(), null, 2));
  console.log(`Wrote ${allKeys.size} literal keys to ${keysOut}`);
}