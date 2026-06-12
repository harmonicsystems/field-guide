#!/usr/bin/env node
// Converts an approved corkboard GitHub issue into a content file.
// Reads the issue-form body from ISSUE_BODY and the number from
// ISSUE_NUMBER; writes src/content/corkboard/issue-<n>.md.
//
// Rules enforced here (the form can't enforce them):
//   - note ≤ 280 chars (hard reject — the submitter shortens and re-files)
//   - expiry defaults to +14 days, clamps to +60, ignores past/invalid dates
//   - free-text place names resolve to a places.ts slug only on an
//     unambiguous match; ambiguous or unknown names just omit the link
//
// Exit codes: 0 = file written; 1 = validation failed (message on stdout,
// the workflow relays it to the issue as a comment).
//
// Test locally:
//   ISSUE_BODY="$(cat fixture.md)" ISSUE_NUMBER=99 TODAY=2026-06-12 \
//     node scripts/corkboard-from-issue.mjs

import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT_DIR = join(ROOT, 'src', 'content', 'corkboard');
const PLACES_TS = join(ROOT, 'src', 'data', 'places.ts');

const MAX_NOTE_CHARS = 280;
const DEFAULT_DAYS = 14;
const MAX_DAYS = 60;

const body = process.env.ISSUE_BODY ?? '';
const issueNumber = process.env.ISSUE_NUMBER ?? '';

if (!body.trim() || !/^\d+$/.test(issueNumber)) {
  console.log('Missing or invalid ISSUE_BODY / ISSUE_NUMBER.');
  process.exit(1);
}

// "Today" is overridable for tests; date-only precision throughout.
const today = process.env.TODAY
  ? new Date(process.env.TODAY + 'T12:00:00')
  : new Date();

// ---- parse the issue-form body ("### Label\n\nvalue" blocks) ----

function parseForm(text) {
  const fields = {};
  const sections = text.replace(/\r\n/g, '\n').split(/^### /m).slice(1);
  for (const sec of sections) {
    const nl = sec.indexOf('\n');
    const label = (nl === -1 ? sec : sec.slice(0, nl)).trim();
    let value = nl === -1 ? '' : sec.slice(nl + 1).trim();
    if (value === '_No response_') value = '';
    fields[label] = value;
  }
  return fields;
}

const fields = parseForm(body);
const from = (fields['Your name or business'] ?? '').trim();
const note = (fields['The note'] ?? '').trim();
const categoryRaw = (fields['Category'] ?? '').trim();
const placeRaw = (fields['Which place is this about? (optional)'] ?? '').trim();
const expiresRaw = (fields['Take it down after (optional)'] ?? '').trim();

// ---- validate ----

const problems = [];
if (!from) problems.push('Missing "Your name or business".');
if (!note) problems.push('Missing "The note".');
if (note.length > MAX_NOTE_CHARS) {
  problems.push(
    `The note is ${note.length} characters — the board caps at ${MAX_NOTE_CHARS}. Shorter is the point: trim it and update the issue, then re-apply the approved label.`,
  );
}

const categoryMap = {
  'business note': 'business',
  event: 'event',
  community: 'community',
};
const category = categoryMap[categoryRaw.toLowerCase()];
if (!category) problems.push(`Unrecognized category "${categoryRaw}".`);

if (problems.length > 0) {
  console.log(problems.join('\n'));
  process.exit(1);
}

// ---- resolve expiry ----

function ymd(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
function addDays(d, n) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

let expires = addDays(today, DEFAULT_DAYS);
let expiryNote = `defaulted to ${DEFAULT_DAYS} days`;
if (/^\d{4}-\d{2}-\d{2}$/.test(expiresRaw)) {
  const requested = new Date(expiresRaw + 'T12:00:00');
  if (!Number.isNaN(requested.getTime()) && requested > today) {
    const cap = addDays(today, MAX_DAYS);
    if (requested > cap) {
      expires = cap;
      expiryNote = `requested ${expiresRaw}, clamped to the ${MAX_DAYS}-day max`;
    } else {
      expires = requested;
      expiryNote = 'as requested';
    }
  } else {
    expiryNote = `requested ${expiresRaw} is in the past — defaulted to ${DEFAULT_DAYS} days`;
  }
} else if (expiresRaw) {
  expiryNote = `couldn't read "${expiresRaw}" as YYYY-MM-DD — defaulted to ${DEFAULT_DAYS} days`;
}

// ---- resolve optional place slug (unambiguous matches only) ----

function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

let placeSlug = null;
let placeNote = '';
if (placeRaw) {
  const src = readFileSync(PLACES_TS, 'utf8');
  const pairs = [];
  const re = /slug:\s*'([^']+)'[\s\S]*?name:\s*(['"])((?:(?!\2).)*)\2/g;
  let m;
  while ((m = re.exec(src))) pairs.push({ slug: m[1], name: m[3] });

  const q = normalize(placeRaw);
  const exact = pairs.filter((p) => normalize(p.name) === q || p.slug === placeRaw);
  const partial = pairs.filter(
    (p) => normalize(p.name).includes(q) || q.includes(normalize(p.name)),
  );
  const matches = exact.length > 0 ? exact : partial;
  if (matches.length === 1) {
    placeSlug = matches[0].slug;
    placeNote = `linked to ${matches[0].name}`;
  } else if (matches.length > 1) {
    placeNote = `"${placeRaw}" matched ${matches.length} places — left unlinked`;
  } else {
    placeNote = `"${placeRaw}" didn't match a place in the guide — left unlinked`;
  }
}

// ---- write the file ----

function yamlQuote(s) {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

const frontmatter = [
  '---',
  `posted: ${ymd(today)}`,
  `expires: ${ymd(expires)}`,
  `category: ${category}`,
  `from: ${yamlQuote(from)}`,
  ...(placeSlug ? [`place: ${placeSlug}`] : []),
  '---',
].join('\n');

mkdirSync(OUT_DIR, { recursive: true });
const outPath = join(OUT_DIR, `issue-${issueNumber}.md`);
writeFileSync(outPath, `${frontmatter}\n\n${note}\n`);

const summary = [
  `Wrote ${outPath}`,
  `expires ${ymd(expires)} (${expiryNote})`,
  ...(placeNote ? [placeNote] : []),
].join(' · ');
console.log(summary);

// Hand the workflow what it needs for the issue comment.
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `expires=${ymd(expires)}\nfile=src/content/corkboard/issue-${issueNumber}.md\n`,
  );
}
