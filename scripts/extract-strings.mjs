#!/usr/bin/env node
/**
 * extract-strings.mjs
 *
 * Codemod that wraps static UI strings in `t('...')` for i18n translation.
 *
 * Behaviour (safe subset):
 *   - Wraps JSX elements whose JSXText is the ONLY child (headings, buttons,
 *     labels, cells) into `{t('...')}`.
 *   - Wraps string-literal values of known i18n attributes into `{t('...')}`
 *     (placeholder, title, aria-label, label, aria-placeholder).
 *   - NEVER touches text adjacent to expressions (mixed nodes) — flagged in a
 *     review report instead.
 *   - Skips URLs, numbers/punctuation, Devanagari-only, and already-wrapped text.
 *   - Auto-injects `import { useLanguage } ...` + `const { t } = useLanguage();`
 *     into components that gained wrapped strings.
 *
 * Usage:
 *   node scripts/extract-strings.mjs                  # dry run (report only)
 *   node scripts/extract-strings.mjs --apply          # write files
 *   node scripts/extract-strings.mjs --keys out.json  # report keys too
 */

import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import generateModule from '@babel/generator';
import * as t from '@babel/types';

const ROOT = path.resolve(process.cwd(), 'resources', 'js');
const SKIP_DIRS = new Set(['ui', 'website', 'figma']);
const SKIP_FILES = new Set([
  'Sidebar.tsx',
  'DashboardLayout.tsx',
  'RolesPermissions.tsx',
  'KnowledgeBase.tsx',
  'Home.tsx',
]);

// Attribute props whose string literals are safe to translate.
const WRAP_ATTRS = new Set(['placeholder', 'title', 'aria-label', 'aria-placeholder', 'label']);
const SKIP_ELEMENT_TAGS = new Set(['pre', 'code', 'script', 'style', 'textarea', 'title']);
const TEXT_SKIP_RE = /^[^A-Za-z]*$/; // no ASCII letters: numbers, punctuation, Devanagari
const URL_SKIP_RE = /(mailto:|tel:|https?:|\/\/|[a-z0-9._-]+@[a-z0-9._-]+)/i;

function collectFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      out.push(...collectFiles(full));
    } else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.d.tsx')) {
      out.push(full);
    }
  }
  return out;
}

const cleanText = (raw) => raw.replace(/\s+/g, ' ').trim();

function isWrappableText(raw) {
  const text = cleanText(raw);
  if (text.length < 2) return false;
  if (TEXT_SKIP_RE.test(text)) return false;
  if (URL_SKIP_RE.test(text)) return false;
  if (/^[\u0900-\u097F]/.test(text)) return false; // Devanagari sample data
  return true;
}

function importSpecifierFor(fileDir) {
  const rel = path.relative(fileDir, path.join(ROOT, 'i18n', 'LanguageProvider')).split(path.sep).join('/');
  return rel.startsWith('.') ? rel : './' + rel;
}

function run(file) {
  const dir = path.dirname(file);
  const source = fs.readFileSync(file, 'utf8');
  const result = { file, changed: false, wraps: 0, keys: [], mixed: [], hook: false, component: false };

  if (!source.trim()) return result;

  let ast;
  try {
    ast = parse(source, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
  } catch {
    result.mixed.push({ line: 0, text: 'PARSE ERROR — skipped' });
    return result;
  }

  const traverse = traverseModule.default ?? traverseModule;
  const generate = generateModule.default ?? generateModule;
  const wraps = [];
  const mixed = [];

  traverse(ast, {
    JSXElement(nodePath) {
      const el = nodePath.node;
      const tag = el.openingElement.name.name;
      if (typeof tag !== 'string' || SKIP_ELEMENT_TAGS.has(tag)) return;

      const children = el.children.filter((c) => !(t.isJSXText(c) && cleanText(c.value).length === 0));

      if (children.length === 1 && t.isJSXText(children[0]) && isWrappableText(children[0].value)) {
        wraps.push({
          path: nodePath.get('children')[0],
          text: cleanText(children[0].value),
        });
      } else if (children.some(t.isJSXExpressionContainer)) {
        const parts = children.filter(t.isJSXText).map((c) => cleanText(c.value)).filter(Boolean);
        if (parts.length > 0) {
          mixed.push({ line: el.loc?.start.line ?? 0, text: parts.join(' | ').slice(0, 120) });
        }
      }
    },
    JSXAttribute(nodePath) {
      const attr = nodePath.node;
      if (!WRAP_ATTRS.has(attr.name.name)) return;
      if (attr.value?.type === 'StringLiteral' && isWrappableText(attr.value.value)) {
        wraps.push({ path: nodePath.get('value'), text: cleanText(attr.value.value) });
      }
    },
  });

  result.mixed = mixed;

  if (wraps.length === 0) return result;

  const keys = [...new Set(wraps.map((w) => w.text))];
  result.keys = keys;
  result.wraps = wraps.length;

  // Pick a hook identifier that won't collide with an existing `t` binding.
  let hookId = 't';
  traverse(ast, {
    Program(prog) {
      if (prog.scope.hasBinding('t')) hookId = 'translate';
    },
  });

  for (const w of wraps) {
    const expr = t.jsxExpressionContainer(t.callExpression(t.identifier(hookId), [t.stringLiteral(w.text)]));
    if (w.path) w.path.replaceWith(expr);
  }

const hasLanguageImport = ast.program.body.some(
    (d) => t.isImportDeclaration(d) && typeof d.source.value === 'string' && d.source.value.includes('i18n/LanguageProvider')
  );

  // Locate the component function/arrow to receive the hook: default export,
  // named export referenced by `export default Foo`, or a named `export function`.
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
          if (binding.path.isFunctionDeclaration()) {
            target = { node: binding.path.node };
          } else if (binding.path.isVariableDeclarator()) {
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
        if (target) {
          p.skip();
          return;
        }
        const d = p.node.declaration;
        if (t.isFunctionDeclaration(d)) {
          target = { node: d };
        } else if (t.isVariableDeclaration(d) && d.declarations.length === 1) {
          const init = d.declarations[0].init;
          if (t.isArrowFunctionExpression(init)) target = { node: init };
        }
      },
    });
  }

  if (!hasLanguageImport && target) {
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
  }
  if (!hasLanguageImport && !target && wraps.length > 0) {
    result.warn = 'wrapped strings but no component export found to receive the hook';
  }

  if (!hasLanguageImport) {
    const importDecl = t.importDeclaration(
      [t.importSpecifier(t.identifier('useLanguage'), t.identifier('useLanguage'))],
      t.stringLiteral(importSpecifierFor(dir))
    );
    ast.program.body.unshift(importDecl);
  }

  const { code } = generate(ast, { retainLines: true, comments: true, jsescOption: { minimal: true } }, source);
  result.changed = code !== source;
  result.code = code;

  return result;
}

// ---- CLI ----
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const keysArgIdx = args.indexOf('--keys');
const keysFile = keysArgIdx >= 0 && args[keysArgIdx + 1] ? path.resolve(args[keysArgIdx + 1]) : null;
const dirArgIdx = args.indexOf('--dir');
const dir = dirArgIdx >= 0 && args[dirArgIdx + 1] ? path.resolve(args[dirArgIdx + 1]) : process.cwd();

const files = collectFiles(path.join(dir, 'resources', 'js', 'Pages')).filter(
  (f) => !SKIP_FILES.has(path.basename(f))
);

let totalWraps = 0;
let totalChanged = 0;
const allKeys = new Set();
const report = [];
const allMixed = [];

for (const file of files) {
  const r = run(file);
  if (r.skipped || r.wraps === 0) continue;
  r.keys.forEach((k) => allKeys.add(k));
  totalWraps += r.wraps;
  if (r.changed) totalChanged += 1;
  report.push(r);
  r.mixed.forEach((m) => allMixed.push({ file: r.file, ...m }));
}

console.log(`\nScanned ${files.length} .tsx files (excluding Pages/ui, Pages/website, Pages/figma).`);
console.log(`Files with wrapped strings: ${report.length}  |  strings wrapped: ${totalWraps}  |  unique keys: ${allKeys.size}`);

if (apply) {
  for (const r of report) {
    if (r.changed && r.code) fs.writeFileSync(r.file, r.code);
  }
  console.log(`Applied changes to ${totalChanged} files.`);
} else {
  console.log('\nDRY RUN — pass --apply to write. Files to change:');
  for (const r of report.slice(0, 50)) {
    console.log(
      `  +${String(r.wraps).padStart(3)}  ${path.relative(process.cwd(), r.file)}${r.hook ? '  [hook]' : ''}${r.mixed.length ? `  (${r.mixed.length} mixed)` : ''}`
    );
  }
  if (report.length > 50) console.log(`  ...and ${report.length - 50} more`);
}

if (allMixed.length) {
  console.log(`\nMIXED NODES (review manually): ${allMixed.length}`);
  for (const m of allMixed.slice(0, 40)) {
    console.log(`  L${String(m.line).padStart(4)} ${path.relative(process.cwd(), m.file)} :: ${m.text}`);
  }
  if (allMixed.length > 40) console.log(`  ...and ${allMixed.length - 40} more`);
}

const warnings = report.filter((r) => r.warn);
if (warnings.length) {
  console.log(`\nWARN: wrapped files missing an injectable hook (${warnings.length}):`);
  for (const r of warnings) console.log(`  ${path.relative(process.cwd(), r.file)} :: ${r.warn}`);
}

if (keysFile) {
  fs.mkdirSync(path.dirname(keysFile), { recursive: true });
  fs.writeFileSync(keysFile, JSON.stringify([...allKeys].sort(), null, 2));
  console.log(`Wrote ${allKeys.size} keys to ${keysFile}`);
}