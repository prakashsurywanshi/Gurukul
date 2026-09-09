#!/usr/bin/env node
/**
 * extract-mixed.mjs
 *
 * Follow-up to extract-strings.mjs: wraps translatable strings that the first
 * codemod deliberately skipped because they live in "mixed" / expression
 * positions. Safe, AST-verified transformations only:
 *
 *   1. Mixed JSX elements (text + {expression}): wrap each translatable text
 *      segment in `t('...')`, keeping the dynamic expression untouched.
 *        Section {section}        -> {t('Section')} {section}
 *        {c.name} - Section {c.sec}-> {c.name} {t('-')}... (punct skipped)
 *
 *   2. String-literal branches of conditional / logical expressions:
 *        {ok ? "Saving..." : "Save Changes"} -> {ok ? t("Saving...") : t("Save Changes")}
 *        {isAdmin && "Admin Panel"}          -> {isAdmin && t("Admin Panel")}
 *
 *   Wraps targets that are NOT part of a classname, URL, punctuation-only,
 *   Devanagari text, or an already-`t(...)`-wrapped call.
 *
 *   Auto-injects `useLanguage` + `const { t } = useLanguage();` into files that
 *   gained wrapped strings (same approach as extract-strings.mjs).
 *
 * Usage:
 *   node scripts/extract-mixed.mjs             # dry run (report only)
 *   node scripts/extract-mixed.mjs --apply     # write files
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
const SKIP_FILES = new Set([
  'Sidebar.tsx',
  'DashboardLayout.tsx',
  'RolesPermissions.tsx',
  'KnowledgeBase.tsx',
  'Home.tsx',
]);

function collectFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      out.push(...collectFiles(full));
    } else if (entry.name.endsWith('.tsx') && !SKIP_FILES.has(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const cleanText = (raw) => raw.replace(/\s+/g, ' ').trim();
const TEXT_SKIP_RE = /^[^A-Za-z]*$/;
const URL_SKIP_RE = /(mailto:|tel:|https?:|\/\/|[a-z0-9._-]+@[a-z0-9._-]+)/i;

function isWrappableString(value) {
  const text = cleanText(value);
  if (text.length < 2) return false;
  if (TEXT_SKIP_RE.test(text)) return false; // numbers, punctuation
  if (URL_SKIP_RE.test(text)) return false;
  if (/^[\u0900-\u097F]/.test(text)) return false; // Devanagari sample data
  // Must START with a letter or digit. This excludes route paths (`/profile`),
  // leading-punctuation fragments (`- Section`, `| Date:`, `). Click`), and
  // `__private__` style tokens — none of which make valid translation keys.
  if (!/^[A-Za-z0-9]/.test(text)) return false;
  if (/^[0-9]+$/.test(text)) return false; // pure numeric labels
  return true;
}

function importSpecifierFor(fileDir) {
  const rel = path.relative(fileDir, path.join(ROOT, 'i18n', 'LanguageProvider')).split(path.sep).join('/');
  return rel.startsWith('.') ? rel : './' + rel;
}

function run(file) {
  const dir = path.dirname(file);
  const source = fs.readFileSync(file, 'utf8');
  const result = { file, changed: false, wraps: 0, keys: [], hook: false };

  if (!source.trim()) return result;

  let ast;
  try {
    ast = parse(source, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
  } catch {
    result.warn = 'PARSE ERROR — skipped';
    return result;
  }

  const wraps = [];
  const keys = new Set();

  // Hook identifier per file.
  let hookId = 't';
  traverse(ast, {
    Program(prog) {
      if (prog.scope.hasBinding('t')) hookId = 'translate';
    },
  });

  const wrapNode = (node, value) => {
    const expr = t.callExpression(t.identifier(hookId), [t.stringLiteral(cleanText(value))]);
    wraps.push({ parent: null, value: cleanText(value) });
    keys.add(cleanText(value));
    return t.jsxExpressionContainer(expr);
  };

  // Helper: skip a string literal that's already inside a t()/translate() call.
  const isAlreadyT = (p) => {
    let node = p.parentPath;
    while (node && !node.isProgram()) {
      if (node.isCallExpression() && node.node.callee && (node.node.callee.name === 't' || node.node.callee.name === 'translate')) {
        return true;
      }
      node = node.parentPath;
    }
    return false;
  };

  // Wrap translatable string-literal branches inside conditional/logical expressions.
  const wrapStringBranches = (p, node) => {
    if (!node) return node;
    if (t.isStringLiteral(node) && isWrappableString(node.value) && !isAlreadyT(p)) {
      const val = cleanText(node.value);
      wraps.push({ value: val });
      keys.add(val);
      return t.callExpression(t.identifier(hookId), [t.stringLiteral(val)]);
    }
    if (t.isConditionalExpression(node)) {
      node.consequent = wrapStringBranches(p, node.consequent);
      node.alternate = wrapStringBranches(p, node.alternate);
    } else if (t.isLogicalExpression(node)) {
      node.right = wrapStringBranches(p, node.right);
      node.left = wrapStringBranches(p, node.left);
    }
    return node;
  };

  traverse(ast, {
    JSXElement(nodePath) {
      const el = nodePath.node;
      const children = el.children;
      const hasExpr = children.some(t.isJSXExpressionContainer);
      if (!hasExpr) return;

      // 1) Wrap translatable JSXText segments (in mixed nodes).
      children.forEach((child, i) => {
        if (!t.isJSXText(child)) return;
        const txt = cleanText(child.value);
        if (!isWrappableString(txt)) return;
        const replacement = t.jsxExpressionContainer(
          t.callExpression(t.identifier(hookId), [t.stringLiteral(txt)])
        );
        el.children[i] = replacement;
        wraps.push({ value: txt });
        keys.add(txt);
      });

      // 2) Wrap string-literal branches in nested conditional/logical exprs.
      children.forEach((child) => {
        if (!t.isJSXExpressionContainer(child)) return;
        const e = child.expression;
        if (t.isConditionalExpression(e) || t.isLogicalExpression(e)) {
          wrapStringBranches(nodePath, e);
        }
      });
    },

    JSXAttribute(nodePath) {
      const attr = nodePath.node;
      if (!attr.value || !t.isJSXExpressionContainer(attr.value)) return;
      const e = attr.value.expression;
      if (t.isConditionalExpression(e) || t.isLogicalExpression(e)) {
        wrapStringBranches(nodePath, e);
      }
    },
  });

  result.keys = [...keys];
  result.wraps = wraps.length;
  if (wraps.length === 0) return result;

  // Inject useLanguage + const { t } = useLanguage() into the primary component.
  // Reuse the same component-targeting logic as extract-strings.mjs.
  const hasLanguageImport = ast.program.body.some(
    (d) => t.isImportDeclaration(d) && String(d.source.value).includes('i18n/LanguageProvider')
  );

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
  if (!hasLanguageImport && !target) {
    result.warn = 'wrapped strings but no component export found to receive the hook';
  }

  if (!hasLanguageImport) {
    ast.program.body.unshift(
      t.importDeclaration(
        [t.importSpecifier(t.identifier('useLanguage'), t.identifier('useLanguage'))],
        t.stringLiteral(importSpecifierFor(dir))
      )
    );
  }

  const { code } = generate(ast, { retainLines: true, comments: true, jsescOption: { minimal: true } }, source);
  result.changed = code !== source && wraps.length > 0;
  result.code = code;

  return result;
}

// ---- CLI ----
const files = collectFiles(path.join(ROOT, 'Pages'));

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

console.log(`Scanned ${files.length} .tsx files (excluding Pages/ui, Pages/website, Pages/figma, and manual files).`);
console.log(`Strings wrapped: ${totalWraps} across ${changed.length} files  |  unique new keys: ${allKeys.size}`);

if (!APPLY) {
  console.log('\nDRY RUN — pass --apply to write. Files to change:');
  for (const r of changed.slice(0, 60)) {
    console.log(`  +${String(r.wraps).padStart(3)}  ${path.relative(process.cwd(), r.file)}${r.hook ? '  [hook]' : ''}`);
  }
  if (changed.length > 60) console.log(`  ...and ${changed.length - 60} more`);
} else {
  for (const r of changed) {
    if (r.code) fs.writeFileSync(r.file, r.code);
  }
  console.log(`Applied changes to ${changed.length} files.`);
}

if (warnings.length) {
  console.log(`\nWARN: wrapped files missing an injectable hook (${warnings.length}):`);
  for (const w of warnings) console.log(`  ${path.relative(process.cwd(), w.file)} :: ${w.warn}`);
}

const keysOut = path.resolve('storage/app/sync-chunks/mixed-keys.json');
if (allKeys.size) {
  fs.mkdirSync(path.dirname(keysOut), { recursive: true });
  fs.writeFileSync(keysOut, JSON.stringify([...allKeys].sort(), null, 2));
  console.log(`Wrote ${allKeys.size} keys to ${keysOut}`);
}
