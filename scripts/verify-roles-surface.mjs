import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

const role = process.argv[2];
if (!role) {
    console.error('usage: node scripts/verify-roles-surface.mjs <role>');
    process.exit(1);
}

// Reference items intentionally not surfaced for a role, with the reason in
// docs/gap-analysis-v2.md (Deferred / Deliberately-excluded rows).
const EXCLUDED = {
    teacher: new Set([
        'live class settings', // no dedicated settings page for live classes in our surface
        'complaints', // teacher default permission off by design (403)
        'manage online exams', // covered by Exam parity; keep teacher to offline exams
        'homework assignments', // parent-ref parity (S3): Homework shared with parent portal
        'apps center', // platform-scale admin feature
        'logout', // top-bar action, not a sidebar menu item
    ]),
};

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
function walkGroup(group) {
    const visibleItems = [];
    function walkItems(items) {
        for (const item of items) {
            const itemVisible = item.roles === undefined || item.roles.includes(role);
            if (itemVisible) {
                visibleItems.push(normalize(item.label));
                if (item.items?.length) walkItems(item.items);
            }
        }
    }
    if (group.items) walkItems(group.items);
    if (visibleItems.length && group.label) visible.push(normalize(group.label));
    visible.push(...visibleItems);
}
for (const group of config) walkGroup(group);

const refLabels = [];
function walkRef(nodes) {
    for (const node of nodes) {
        refLabels.push(normalize(node.label));
        if (node.children?.length) walkRef(node.children);
    }
}
walkRef(ref);

const omitted = EXCLUDED[role] ?? new Set();
const oursSet = new Set(visible);
const missing = [...new Set(refLabels.filter((x) => x && !oursSet.has(x) && !omitted.has(x)))];
const excluded = [...new Set(refLabels.filter((x) => x && !oursSet.has(x) && omitted.has(x)))];
const extra = [...new Set([...oursSet].filter((x) => x && !new Set(refLabels).has(x)))];

console.log(`role=${role} refItems=${new Set(refLabels).size} ourVisible=${oursSet.size}`);
console.log(
    `  matched=${new Set(refLabels.filter((x) => oursSet.has(x))).size} ` +
        `excluded=${excluded.length} missing=${missing.length} extra=${extra.length}`,
);
if (excluded.length) {
    console.log('\n[excluded] reference items intentionally not surfaced (documented):');
    console.log(JSON.stringify(excluded, null, 1));
}
if (missing.length) {
    console.log('\n[missing] reference items not surfaced for this role:');
    console.log(JSON.stringify(missing, null, 1));
}
if (extra.length && extra.length <= 60) {
    console.log('\n[extra] our items not present in reference for this role:');
    console.log(JSON.stringify(extra, null, 1));
}