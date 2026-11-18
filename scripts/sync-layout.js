#!/usr/bin/env node
/* ==========================================================================
   sync-layout.js — copy partials/*.html into every page between markers.

   Markers (one pair per partial, anywhere in the page):
     <!-- partial:head -->   ...   <!-- /partial:head -->
     <!-- partial:header --> ...   <!-- /partial:header -->
     <!-- partial:footer --> ...   <!-- /partial:footer -->

   Everything outside the markers (title, description, canonical, OG,
   JSON-LD, page CSS, <main>) is page-specific and never touched.

   Usage:
     node scripts/sync-layout.js           write changes
     node scripts/sync-layout.js --check   report only, exit 1 if out of sync
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PARTIALS_DIR = path.join(ROOT, 'partials');
const SKIP_DIRS = new Set(['.git', 'node_modules', 'partials', 'scripts', 'docs', 'assets', '.claude']);
const PARTIALS = ['head', 'header', 'footer'];
const CHECK = process.argv.includes('--check');

function readPartial(name) {
  const file = path.join(PARTIALS_DIR, `${name}.html`);
  if (!fs.existsSync(file)) throw new Error(`Missing partial: ${path.relative(ROOT, file)}`);
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').trimEnd();
}

function findPages(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return SKIP_DIRS.has(entry.name) ? [] : findPages(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

function indent(text, pad) {
  return text.split('\n').map((line) => (line ? pad + line : line)).join('\n');
}

const partials = Object.fromEntries(PARTIALS.map((name) => [name, readPartial(name)]));
const pages = findPages(ROOT);
let changed = 0;
let problems = 0;

for (const file of pages) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const original = fs.readFileSync(file, 'utf8');
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  let html = original.replace(/\r\n/g, '\n');
  const missing = [];

  for (const name of PARTIALS) {
    const re = new RegExp(
      `^([ \\t]*)<!-- partial:${name} -->\\n[\\s\\S]*?^[ \\t]*<!-- /partial:${name} -->`,
      'm',
    );
    if (!re.test(html)) {
      missing.push(name);
      continue;
    }
    html = html.replace(re, (_, pad) =>
      `${pad}<!-- partial:${name} -->\n${indent(partials[name], pad)}\n${pad}<!-- /partial:${name} -->`);
  }

  if (missing.length) {
    problems += 1;
    console.warn(`!  ${rel}: missing markers for ${missing.join(', ')}`);
  }

  const output = html.replace(/\n/g, eol);
  if (output !== original) {
    changed += 1;
    if (CHECK) console.log(`x  ${rel} is out of sync`);
    else {
      fs.writeFileSync(file, output);
      console.log(`✓  ${rel} updated`);
    }
  }
}

console.log(`\n${pages.length} page(s) scanned, ${changed} ${CHECK ? 'out of sync' : 'updated'}, ${problems} with missing markers.`);
if (CHECK && (changed || problems)) process.exitCode = 1;
