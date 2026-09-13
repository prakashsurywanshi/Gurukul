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
        'apps center', // platform-scale admin feature
        'logout', // top-bar action, not a sidebar menu item
    ]),
    accountant: new Set([
        'logout', // top-bar action, not a sidebar menu item (same rationale as teacher)
    ]),
    parent: new Set([
        'viewing kabir', // dynamic child-switcher header; surfaces as our child selector
        'kabir singh', // fixture child name (switch-child), handled by our child switcher
        'shlok verma', // fixture child name (switch-child), handled by our child switcher
        'rajesh singh', // fixture child name (switch-child), handled by our child switcher
        'john paul', // fixture child name (switch-child), handled by our child switcher
        'study center', // container group; all children (Classwork & Logbook, Syllabus & Materials, Live Classes) are surfaced in the Parent Portal section
        'logout', // top-bar action, not a sidebar menu item (same rationale as teacher)
    ]),
    schooladmin: new Set([
        'logout', // top-bar action, not a sidebar menu item (same rationale as teacher)
    ]),
};

// Label-variant equivalences (reference label -> our sidebar labels that cover
// the same surface). Kept per-role so role-specific wording stays faithful.
const ALIASES = {
    teacher: {
        'homework assignments': ['homework'], // label-parity: our item is Homework inside Study Center
    },
    schooladmin: {
        'class timetable': ['class time table'],
        'cocurricular grades': ['cocurricular areas'],
        'manage uploads': ['upload marksheet'],
        'teacher remarks': ['enter report card remarks'],
        'government reports': ['regulator reports'],
        'homework assignments': ['homework'],
        'staff id cards': ['staff id card'],
        'manage books': ['e library'],
        inventory: ['inventory dashboard'],
        'qr attendance setting': ['qr attendance'],
        'qr attendance report': ['qr scan audit'],
        'all devices': ['biometric devices'],
        'attendance logs': ['agent logs'],
        'face monitoring': ['face search'],
        'lesson plan approvals': ['lesson plan review'],
        'search by photo': ['face search'],
        'student houses': ['houses categories'],
        'student categories': ['houses categories'],
        'website overview': ['cms editor'],
        'online transactions': ['all transactions'],
        cctv: ['camera wall'],
        'cctv cameras': ['camera wall'], // combined camera wall + camera list page (CCTV)
        'cctv access log': ['camera wall'], // access-log table is rendered on the same CCTV page
        'live vehicle tracking': ['live operations'],
        'postal records': ['postal dispatch'], // in/out postal log covered by Postal Dispatch/Delivery pages
        'gate terminal': ['gate passes'], // gate kiosk actions surfaced in the Gate Passes management page
        'admission form fields': ['admission settings'], // admission sections/fields managed on the Admission Settings page
        'website full html': ['pages'], // custom/full-HTML pages built in the Pages Builder
    },
};

// The demo parent portal authenticates as our `student` role (DemoLogin maps
// parent -> student), so parent reference items are matched against the
// student-visible sidebar items. The demo School Admin panel (schooladmin) is
// our `admin` role (org-level school administration surface).
const OUR_ROLE = { parent: 'student', schooladmin: 'admin' }[role] ?? role;

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
            const itemVisible = item.roles === undefined || item.roles.includes(OUR_ROLE);
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
const aliases = ALIASES[role] ?? {};
const oursSet = new Set(visible);
const isCovered = (x) =>
    oursSet.has(x) || (aliases[x] ?? []).some((alias) => oursSet.has(alias));
const missing = [...new Set(refLabels.filter((x) => x && !isCovered(x) && !omitted.has(x)))];
const excluded = [...new Set(refLabels.filter((x) => x && !isCovered(x) && omitted.has(x)))];
const extra = [...new Set([...oursSet].filter((x) => x && !new Set(refLabels).has(x)))];

console.log(`role=${role} refItems=${new Set(refLabels).size} ourVisible=${oursSet.size}`);
console.log(
    `  matched=${new Set(refLabels.filter((x) => isCovered(x))).size} ` +
        `excluded=${excluded.length} missing=${missing.length} extra=${extra.length}`,
);
if (aliasedCount()) {
    console.log('\n[aliased] reference labels covered via ALIASES map:');
    console.log(JSON.stringify(aliasedCount(), null, 1));
}
function aliasedCount() {
    const out = [];
    for (const lab of refLabels) {
        if (lab && !oursSet.has(lab) && isCovered(lab)) out.push(lab);
    }
    return out;
}
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
