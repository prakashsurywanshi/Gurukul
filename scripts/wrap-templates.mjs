#!/usr/bin/env node
/**
 * wrap-templates.mjs
 *
 * Wraps visible JSX template literals (the last major unwrapped UI-text audit
 * category). Only JSX *text-position* expression containers are touched —
 * attribute values (className, key, id, value, ...) are never modified, so
 * classname strings and data keys stay byte-for-byte identical.
 *
 * Transformations (with t() `{param}` interpolation):
 *   {`Status: ${status}`}     -> {t('Status: {status}', { status })}
 *   {`In ${item.session}`}    -> {t('In {item.session}', { 'item.session': item.session })}
 *   {`Hello`}                 -> {t('Hello')}
 *
 * Skipped when any `${expr}` inside the template is not a plain identifier or
 * member expression (calls, ternaries, nested templates), when the skeleton is
 * punctuation/URL-only, or when it's already inside a t()/translate() call.
 *
 * Auto-injects useLanguage + `const { t } = useLanguage();` like the other
 * codemods. Writes gathered skeleton keys to the sync-chunks keys file.
 *
 * Usage:
 *   node scripts/wrap-templates.mjs          # dry run (report only)
 *   node scripts/wrap-templates.mjs --apply  # write files
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

const URL_SKIP_RE = /(mailto:|tel:|https?:|\/\/|[a-z0-9._-]+@[a-z0-9._-]+)/i;

function startsWithValidKeyChar(text) {
  return /^[A-Za-z0-9]/.test(text);
}

function isWrappableTemplate(skeleton) {
  const clean = skeleton.replace(/\s+/g, ' ').trim();
  if (clean.length < 2) return false;
  if (!/[A-Za-z]/.test(clean)) return false;          // punctuation/data skeletons
  if (!startsWithValidKeyChar(clean)) return false;   // must form a valid key
  if (URL_SKIP_RE.test(clean)) return false;
  if (/^[\u0900-\u097F]/.test(clean)) return false;   // Devanagari sample data
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

function expressionKey(expr) {
  if (t.isIdentifier(expr)) return expr.name;
  if (t.isMemberExpression(expr) && !expr.computed && t.isIdentifier(expr.property)) {
    let obj = expr.object;
    const parts = [expr.property.name];
    while (t.isMemberExpression(obj) && !obj.computed && t.isIdentifier(obj.property)) {
      parts.unshift(obj.property.name);
      obj = obj.object;
    }
    if (t.isIdentifier(obj)) {
      parts.unshift(obj.name);
      return parts.join('.');
    }
  }
  return null;
}

function isAlreadyInT(nodePath, start) {
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
  const wrapped = [];

  const tryWrapTemplate = (nodePath, template) => {
    const quasis = template.quasis.map((q) => q.value.cooked ?? q.value.raw);
    if (quasis.length !== template.expressions.length + 1) return null;

    const params = [];
    const keyParts = [];
    let ok = true;
    for (let i = 0; i < template.expressions.length; i++) {
      const key = expressionKey(template.expressions[i]);
      if (key === null) { ok = false; break; }
      params.push(t.objectProperty(t.stringLiteral(key), template.expressions[i]));
      keyParts.push(quasis[i], `{${key}}`);
    }
    if (!ok) return null;
    keyParts.push(quasis[quasis.length - 1]);

    const skeleton = keyParts.join('');
    if (!isWrappableTemplate(skeleton)) return null;

    const args = [t.stringLiteral(skeleton.replace(/\s+/g, ' ').trim())];
    if (params.length > 0) {
      args.push(t.objectExpression(params));
    }
    wrapped.push(skeleton);
    keys.add(skeleton.replace(/\s+/g, ' ').trim());

    return t.callExpression(t.identifier(hookId), args);
  };

  const wrapBranch = (nodePath, node) => {
    if (t.isTemplateLiteral(node)) {
      return tryWrapTemplate(nodePath, node) ?? node;
    }
    if (t.isConditionalExpression(node)) {
      node.consequent = wrapBranch(nodePath, node.consequent);
      node.alternate = wrapBranch(nodePath, node.alternate);
    } else if (t.isLogicalExpression(node)) {
      node.left = wrapBranch(nodePath, node.left);
      node.right = wrapBranch(nodePath, node.right);
    }
    return node;
  };

  const wrapContainer = (nodePath, container) => {
    const e = container.expression;
    if (isAlreadyInT(nodePath, nodePath)) return;
    if (t.isTemplateLiteral(e)) {
      container.expression = tryWrapTemplate(nodePath, e) ?? e;
    } else if (t.isConditionalExpression(e) || t.isLogicalExpression(e)) {
      wrapBranch(nodePath, e);
    }
  };

  traverse(ast, {
    JSXElement(nodePath) {
      nodePath.node.children.forEach((child) => {
        if (t.isJSXExpressionContainer(child)) {
          const e = child.expression;
          if (t.isTemplateLiteral(e) || t.isConditionalExpression(e) || t.isLogicalExpression(e)) {
            wrapContainer(nodePath, child);
          }
        }
      });
    },
    JSXFragment(nodePath) {
      nodePath.node.children.forEach((child) => {
        if (t.isJSXExpressionContainer(child)) {
          const e = child.expression;
          if (t.isTemplateLiteral(e) || t.isConditionalExpression(e) || t.isLogicalExpression(e)) {
            wrapContainer(nodePath, child);
          }
        }
      });
    },
  });

  result.keys = [...keys];
  result.wraps = wrapped.length;
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
      result.warn = 'wrapped templates but no component export found to receive the hook';
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
console.log(`Visible templates wrapped: ${totalWraps} across ${changed.length} files  |  unique skeleton keys: ${allKeys.size}`);

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

const keysOut = path.resolve('storage/app/sync-chunks/template-keys.json');
if (allKeys.size) {
  fs.mkdirSync(path.dirname(keysOut), { recursive: true });
  fs.writeFileSync(keysOut, JSON.stringify([...allKeys].sort(), null, 2));
  console.log(`Wrote ${allKeys.size} skeleton keys to ${keysOut}`);
}