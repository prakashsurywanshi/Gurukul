#!/usr/bin/env node
/**
 * fix-unbound-hooks.mjs
 *
 * Follow-up to extract-strings.mjs: injects `const { t } = useLanguage();` into
 * any function/arrow component that references `t`/`translate` WITHOUT a binding
 * in scope (sibling components rendered inside the primary one). All such
 * components render under the LanguageProvider tree, so calling the hook in
 * each is safe and idiomatic.
 *
 * Usage:
 *   node scripts/fix-unbound-hooks.mjs            # dry run
 *   node scripts/fix-unbound-hooks.mjs --apply    # write files
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

const changed = [];
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parse(src, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
  } catch {
    continue;
  }

  const targets = new Map(); // node -> Set of ref names needed
  traverse(ast, {
    ReferencedIdentifier(p) {
      const name = p.node.name;
      if (name !== 't' && name !== 'translate') return;
      if (p.scope.hasBinding(name)) return;
      const fn = p.getFunctionParent();
      if (!fn) return;
      const names = targets.get(fn.node) ?? new Set();
      names.add(name);
      targets.set(fn.node, names);
    },
  });

  if (targets.size === 0) continue;

  for (const [node, names] of targets) {
    const statements = [];
    for (const name of names) {
      statements.push(
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.objectPattern([t.objectProperty(t.identifier(name), t.identifier(name), false, true)]),
            t.callExpression(t.identifier('useLanguage'), [])
          ),
        ])
      );
    }

    if (t.isArrowFunctionExpression(node) && !t.isBlockStatement(node.body)) {
      node.body = t.blockStatement([...statements, t.returnStatement(node.body)]);
    } else if (t.isBlockStatement(node.body)) {
      node.body.body.unshift(...statements);
    }
  }

  // Ensure useLanguage is imported.
  const hasImport = ast.program.body.some(
    (d) => t.isImportDeclaration(d) && String(d.source.value).includes('i18n/LanguageProvider')
  );
  if (!hasImport) {
    const fileDir = path.dirname(file);
    const _rel = path.relative(fileDir, path.join(path.resolve('resources/js'), 'i18n', 'LanguageProvider')).split(path.sep).join('/');
    const spec = _rel.startsWith('.') ? _rel : './' + _rel;
    ast.program.body.unshift(
      t.importDeclaration(
        [t.importSpecifier(t.identifier('useLanguage'), t.identifier('useLanguage'))],
        t.stringLiteral(spec)
      )
    );
  }

  const { code } = generate(ast, { retainLines: true, comments: true, jsescOption: { minimal: true } }, src);
  if (code === src) continue;
  changed.push({ file, count: targets.size });
  if (APPLY) fs.writeFileSync(file, code);
}

console.log(
  changed.length
    ? `${APPLY ? 'Applied' : 'WOULD apply'} hook injection to ${changed.length} files:`
    : 'No files need fixing.'
);
for (const c of changed.slice(0, 60)) {
  console.log(`  +${String(c.count).padStart(2)} fns  ${path.relative(process.cwd(), c.file)}`);
}
if (changed.length > 60) console.log(`  ...and ${changed.length - 60} more`);