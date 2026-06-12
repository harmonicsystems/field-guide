#!/usr/bin/env node
// SEO/GEO post-build validator. Walks dist/ and asserts:
// - Unique <title> and <meta description> across all HTML pages
// - Title ≤ 65 chars; description 50–160 chars
// - <link rel="canonical"> on every page
// - OG quartet (og:title, og:description, og:url, og:image)
// - Detail pages have <link rel="alternate" type="text/markdown">
// - /llms.txt exists and is non-empty
// - One {slug}.md per place from src/data/places.ts
// Exits non-zero on any failure so it blocks the build.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const PLACES_TS = join(ROOT, 'src', 'data', 'places.ts');

const TITLE_MAX = 65;
const DESC_MIN = 50;
const DESC_MAX = 160;

const errors = [];
const warnings = [];
function err(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

if (!existsSync(DIST)) {
  console.error('seo-check: dist/ not found — run `astro build` first.');
  process.exit(1);
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const all = walk(DIST);
const htmlFiles = all.filter((f) => f.endsWith('.html'));
const mdFiles = all.filter((f) => f.endsWith('.md'));

// Tag readers. Match each tag with a regex that respects the attribute's
// own quote delimiter, so apostrophes inside double-quoted values don't
// truncate (e.g. content="Hamrah's...").
function readAttrValue(tagHtml, attrName) {
  // Try double-quoted first, then single-quoted.
  const dq = tagHtml.match(new RegExp(`\\b${attrName}="([^"]*)"`, 'i'));
  if (dq) return dq[1];
  const sq = tagHtml.match(new RegExp(`\\b${attrName}='([^']*)'`, 'i'));
  return sq ? sq[1] : null;
}

function findTag(html, tag, attrName, attrVal) {
  const re = new RegExp(
    `<${tag}\\b[^>]*\\b${attrName}=("${attrVal}"|'${attrVal}')[^>]*>`,
    'i',
  );
  const m = html.match(re);
  return m ? m[0] : null;
}

function attr(html, tag, attrName, attrVal) {
  const tagHtml = findTag(html, tag, attrName, attrVal);
  if (!tagHtml) return null;
  const v = readAttrValue(tagHtml, 'content');
  return v ?? '';
}

function linkAttr(html, relVal) {
  const tagHtml = findTag(html, 'link', 'rel', relVal);
  if (!tagHtml) return null;
  return {
    tag: tagHtml,
    href: readAttrValue(tagHtml, 'href'),
    type: readAttrValue(tagHtml, 'type'),
  };
}

function findAllLinks(html, relVal) {
  const re = new RegExp(
    `<link\\b[^>]*\\brel=("${relVal}"|'${relVal}')[^>]*>`,
    'gi',
  );
  const results = [];
  let m;
  while ((m = re.exec(html))) {
    const tagHtml = m[0];
    results.push({
      tag: tagHtml,
      href: readAttrValue(tagHtml, 'href'),
      type: readAttrValue(tagHtml, 'type'),
    });
  }
  return results;
}

const titles = new Map(); // title -> [paths]
const descs = new Map();  // desc -> [paths]

for (const file of htmlFiles) {
  const rel = relative(DIST, file).split(sep).join('/');
  const html = readFileSync(file, 'utf8');

  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  if (!titleMatch) {
    err(`${rel}: missing <title>`);
    continue;
  }
  const title = titleMatch[1].trim();
  if (title.length === 0) err(`${rel}: empty <title>`);
  if (title.length > TITLE_MAX)
    err(`${rel}: title is ${title.length} chars (max ${TITLE_MAX}) — "${title}"`);
  if (!titles.has(title)) titles.set(title, []);
  titles.get(title).push(rel);

  const desc = attr(html, 'meta', 'name', 'description');
  if (desc === null) {
    err(`${rel}: missing <meta name="description">`);
  } else {
    if (desc.length < DESC_MIN || desc.length > DESC_MAX) {
      err(
        `${rel}: description is ${desc.length} chars (want ${DESC_MIN}–${DESC_MAX}) — "${desc}"`,
      );
    }
    if (!descs.has(desc)) descs.set(desc, []);
    descs.get(desc).push(rel);
  }

  const canonical = linkAttr(html, 'canonical');
  if (!canonical) err(`${rel}: missing <link rel="canonical">`);

  for (const og of ['og:title', 'og:description', 'og:url', 'og:image']) {
    const v = attr(html, 'meta', 'property', og);
    if (v === null || v.length === 0) err(`${rel}: missing or empty ${og}`);
  }

  // Detail pages (i.e. /{slug}/index.html where slug isn't a known top-level
  // page) must have a <link rel="alternate" type="text/markdown"> that's
  // page-specific (not the global /llms.txt link).
  const isDetailPage =
    /^[^/]+\/index\.html$/.test(rel) &&
    !rel.startsWith('open/') &&
    !rel.startsWith('today/') &&
    !rel.startsWith('calendar/') &&
    !rel.startsWith('notes/');
  if (isDetailPage) {
    const slug = rel.split('/')[0];
    const alts = findAllLinks(html, 'alternate').filter(
      (a) => a.type === 'text/markdown' && a.href && a.href !== '/llms.txt',
    );
    if (alts.length === 0) {
      err(`${rel}: detail page missing per-place <link rel="alternate" type="text/markdown">`);
    } else if (!alts.some((a) => a.href === `/${slug}.md`)) {
      err(`${rel}: alternate markdown link does not point to /${slug}.md`);
    }
  }
}

// Uniqueness.
for (const [title, paths] of titles) {
  if (paths.length > 1) err(`Duplicate <title> "${title}" across: ${paths.join(', ')}`);
}
for (const [desc, paths] of descs) {
  if (paths.length > 1) err(`Duplicate description across: ${paths.join(', ')}`);
}

// /llms.txt and friends.
const llmsPath = join(DIST, 'llms.txt');
if (!existsSync(llmsPath)) {
  err('llms.txt: not found in dist/');
} else {
  const body = readFileSync(llmsPath, 'utf8');
  if (body.trim().length < 500) {
    err(`llms.txt: only ${body.length} chars — looks too short`);
  }
}
const llmsFullPath = join(DIST, 'llms-full.txt');
if (!existsSync(llmsFullPath)) {
  err('llms-full.txt: not found in dist/');
} else {
  const body = readFileSync(llmsFullPath, 'utf8');
  if (body.trim().length < 2000) {
    err(`llms-full.txt: only ${body.length} chars — looks too short for a full export`);
  }
}
for (const feedFile of ['rss.xml', 'feed.json']) {
  if (!existsSync(join(DIST, feedFile))) err(`${feedFile}: not found in dist/`);
}

// One {slug}.md per place.
const placesSrc = readFileSync(PLACES_TS, 'utf8');
const slugs = Array.from(placesSrc.matchAll(/^\s*slug:\s*['"]([^'"]+)['"]/gm)).map(
  (m) => m[1],
);
const mdSlugs = new Set(
  mdFiles
    .map((f) => relative(DIST, f).split(sep).join('/'))
    .filter((p) => /^[^/]+\.md$/.test(p))
    .map((p) => p.replace(/\.md$/, '')),
);
for (const slug of slugs) {
  if (!mdSlugs.has(slug)) err(`Missing /${slug}.md for place "${slug}"`);
}

// Report.
const summary = `seo-check: ${htmlFiles.length} HTML pages, ${slugs.length} places, ${mdSlugs.size} .md files`;
if (warnings.length > 0) {
  console.warn(`\n${summary}`);
  for (const w of warnings) console.warn(`  WARN: ${w}`);
}
if (errors.length > 0) {
  console.error(`\n${summary}`);
  for (const e of errors) console.error(`  FAIL: ${e}`);
  console.error(`\n${errors.length} error(s) — failing build.\n`);
  process.exit(1);
}
console.log(`${summary} — all checks passed.`);
