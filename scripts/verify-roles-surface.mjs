import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

const role = process.argv[2];
if (!role) {
    console.error('usage: node scripts/verify-roles-surface.mjs <role>');
    process.exit(1);
}

const refPath = `docs/reference/sidebar_${role}.json`;
const ref = JSON.parse(await readFile(refPath, 'utf8'));

const result = await build({
    entryPoints: ['resources/js/Pages/sidebarMenu.ts'],
    bundle: true,
    format: 'esm',
    write: false,
    platform: 'node',
    minify: false,
});
const esm = result.outputFiles[0].text;
const mod = await import('data:text/javascript;base64,' + Buffer.from(esm).toString('base64'));
const config = mod.sidebarConfig;

const normalize = (s = '') =>
    String(s)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

const visible = [];
function walkItems(items) {
    for (const item of items) {
        const itemVisible = item.roles === undefined || item.roles.includes(role);
        if (itemVisible) visible.push(normalize(item.label));
        if (item.items?.length && itemVisible) walkItems(item.items);
    }
}
for (const group of config) walkItems(group.items);

const refLabels = [];
function walkRef(nodes) {
    for (const node of nodes) {
        refLabels.push(normalize(node.label));
        if (node.children?.length) walkRef(node.children);
    }
}
walkRef(ref);

const oursSet = new Set(visible);
const missing = [...new Set(refLabels.filter((x) => x && !oursSet.has(x)))];
const extra = [...new Set([...oursSet].filter((x) => x && !new Set(refLabels).has(x)))];

console.log(`role=${role} refItems=${new Set(refLabels).size} ourVisible=${oursSet.size}`);
console.log(`  matched=${new Set(refLabels.filter((x) => oursSet.has(x))).size} missing=${missing.length} extra=${extra.length}`);
if (missing.length) {
    console.log('\n[missing] reference items not surfaced for this role:');
    console.log(JSON.stringify(missing, null, 1));
}
if (extra.length && extra.length <= 60) {
    console.log('\n[extra] our items not present in reference for this role:');
    console.log(JSON.stringify(extra, null, 1));
}