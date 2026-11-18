#!/usr/bin/env node
/* ==========================================================================
   generate-sitemap.js — write sitemap.xml from the pages on disk.

   - Scans every .html page (skips partials, scripts, docs, assets).
   - Leaves out pages with <meta name="robots" content="noindex ...">
     and pages without a canonical link.
   - <loc> is the page's canonical URL, so clean URLs stay consistent.
   - <lastmod> is the date of the page's last git commit, or the file's
     modified date when it has uncommitted changes or is not in git yet.

   Usage:  node scripts/generate-sitemap.js
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['.git', 'node_modules', 'partials', 'scripts', 'docs', 'assets', '.claude']);

function findPages(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findPages(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function git(args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function lastmod(file) {
  const rel = path.relative(ROOT, file);
  const dirty = git(['status', '--porcelain', '--', rel]);
  const committed = git(['log', '-1', '--format=%cs', '--', rel]);
  if (committed && !dirty) return committed;
  return fs.statSync(file).mtime.toISOString().slice(0, 10);
}

const entries = [];
const skipped = [];
for (const file of findPages(ROOT)) {
  const html = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html)) { skipped.push(`${rel} (noindex)`); continue; }
  const canonical = (html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i) || [])[1];
  if (!canonical) { skipped.push(`${rel} (no canonical)`); continue; }
  entries.push({ loc: canonical, lastmod: lastmod(file) });
}

// Home first, then by path depth and name, for a readable file.
entries.sort((a, b) => {
  const depth = (u) => new URL(u).pathname.split('/').filter(Boolean).length;
  return depth(a.loc) - depth(b.loc) || a.loc.localeCompare(b.loc);
});

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `  <url>\n    <loc>${e.loc}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n  </url>`).join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
console.log(`sitemap.xml: ${entries.length} URLs`);
if (skipped.length) console.log(`skipped: ${skipped.join(', ')}`);
