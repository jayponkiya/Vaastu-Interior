#!/usr/bin/env node
/* ==========================================================================
   seo-audit.js — check every page against the quality rules in CLAUDE.md.
   Exits with code 1 (and lists every problem) if any page fails.

   Per page:
     - <html lang="en-IN">
     - <title> 50-60 characters, unique across the site
     - meta description 140-160 characters, unique across the site
     - exactly one <h1>
     - canonical link on https://vaastuinterior.in (not required on 404)
     - Open Graph: og:type, og:title, og:description, og:url, og:image
     - Twitter: twitter:card, twitter:title, twitter:description, twitter:image
     - every <img> has alt, width and height
     - at least one JSON-LD block, and every block parses
     - breadcrumbs (nav.breadcrumbs + BreadcrumbList) on every page but home

   Usage:  node scripts/seo-audit.js
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://vaastuinterior.in';
const SKIP_DIRS = new Set(['.git', 'node_modules', 'partials', 'scripts', 'docs', 'assets', '.claude']);
const NO_CANONICAL = new Set(['404.html']); // error page: never indexed, no canonical URL

function findPages(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findPages(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const decode = (s) => s
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
  return m ? (m[2] ?? m[3]) : null;
};
const metaContent = (html, key, value) => {
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (attr(tag, key) === value) return attr(tag, 'content');
  }
  return null;
};

const problems = [];
const titles = new Map();
const descs = new Map();
const pages = findPages(ROOT).sort();

for (const file of pages) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  // Comments are ignored so notes like '<img>' in a comment do not count.
  const html = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const fail = (msg) => problems.push(`${rel}: ${msg}`);

  // Language
  const htmlTag = (html.match(/<html\b[^>]*>/i) || [''])[0];
  if (attr(htmlTag, 'lang') !== 'en-IN') fail('missing lang="en-IN" on <html>');

  // Title
  const title = decode(((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '').trim());
  if (!title) fail('missing <title>');
  else {
    if (title.length < 50 || title.length > 60) fail(`title is ${title.length} chars (50-60): "${title}"`);
    titles.set(title, [...(titles.get(title) || []), rel]);
  }

  // Description
  const desc = decode((metaContent(html, 'name', 'description') || '').trim());
  if (!desc) fail('missing meta description');
  else {
    if (desc.length < 140 || desc.length > 160) fail(`description is ${desc.length} chars (140-160)`);
    descs.set(desc, [...(descs.get(desc) || []), rel]);
  }

  // H1
  const h1s = (html.match(/<h1\b/gi) || []).length;
  if (h1s !== 1) fail(`${h1s} <h1> elements (need exactly 1)`);

  // Canonical
  const canon = (html.match(/<link\b[^>]*rel="canonical"[^>]*>/i) || [])[0];
  if (!NO_CANONICAL.has(rel)) {
    const href = canon && attr(canon, 'href');
    if (!href) fail('missing canonical link');
    else if (!href.startsWith(`${SITE}/`)) fail(`canonical not on ${SITE}: ${href}`);
  }

  // Open Graph + Twitter
  for (const p of ['og:type', 'og:title', 'og:description', 'og:url', 'og:image']) {
    if (!metaContent(html, 'property', p)) fail(`missing ${p}`);
  }
  for (const n of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
    if (!metaContent(html, 'name', n)) fail(`missing ${n}`);
  }

  // Images
  for (const [tag] of html.matchAll(/<img\b[^>]*>/gi)) {
    const src = attr(tag, 'src') || '(no src)';
    if (attr(tag, 'alt') === null) fail(`img without alt: ${src}`);
    if (!attr(tag, 'width') || !attr(tag, 'height')) fail(`img without width/height: ${src}`);
  }

  // JSON-LD
  const blocks = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  if (!blocks.length) fail('no JSON-LD');
  const types = [];
  blocks.forEach((b, i) => {
    try {
      const data = JSON.parse(b);
      const items = data['@graph'] || [data];
      items.forEach((it) => types.push(...[].concat(it['@type'] || [])));
    } catch (e) {
      fail(`JSON-LD block ${i + 1} does not parse: ${e.message}`);
    }
  });

  // Breadcrumbs
  if (rel !== 'index.html') {
    if (!/<nav\b[^>]*class="[^"]*\bbreadcrumbs\b/i.test(html)) fail('missing breadcrumb navigation');
    if (!types.includes('BreadcrumbList')) fail('missing BreadcrumbList JSON-LD');
  }
}

for (const [t, files] of titles) if (files.length > 1) problems.push(`duplicate title "${t}": ${files.join(', ')}`);
for (const [d, files] of descs) if (files.length > 1) problems.push(`duplicate description "${d.slice(0, 60)}…": ${files.join(', ')}`);

if (problems.length) {
  console.error(`SEO audit failed: ${problems.length} problem(s) across ${pages.length} pages\n`);
  problems.forEach((p) => console.error(`  ✗ ${p}`));
  process.exit(1);
}
console.log(`SEO audit passed: ${pages.length} pages`);
