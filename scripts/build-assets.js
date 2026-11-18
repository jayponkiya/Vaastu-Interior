#!/usr/bin/env node
/* ==========================================================================
   build-assets.js — minify CSS and JS, cache-bust, and point pages at them.

   Sources stay as they are (assets/css/*.css, assets/js/*.js) and remain the
   files you edit. This script writes:
     assets/css/site.min.css      base + layout + components + animations
     assets/css/pages.min.css     inner-page styles
     assets/js/site.min.js        main + animations (every page)
     assets/js/components.min.js
     assets/js/forms.min.js
   then rewrites every <link>/<script> that points at a source (or an older
   .min file) to the .min file with ?v=<content hash>, so long cache headers
   are safe. partials/head.html is updated too, then sync-layout.js runs.

   No dependencies. Minifying is deliberately conservative: comments and
   whitespace go, code is never rewritten. String, template and regex
   literals are left untouched. Hosting gzip/brotli does the rest.

   Run after editing any CSS or JS:   node scripts/build-assets.js
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['.git', 'node_modules', 'scripts', 'docs', 'assets', '.claude']);

const BUNDLES = [
  { out: 'assets/css/site.min.css', type: 'css', src: ['base', 'layout', 'components', 'animations'].map((n) => `assets/css/${n}.css`) },
  { out: 'assets/css/pages.min.css', type: 'css', src: ['assets/css/pages.css'] },
  { out: 'assets/js/site.min.js', type: 'js', src: ['assets/js/main.js', 'assets/js/animations.js'] },
  { out: 'assets/js/components.min.js', type: 'js', src: ['assets/js/components.js'] },
  { out: 'assets/js/forms.min.js', type: 'js', src: ['assets/js/forms.js'] },
];

/* ---- CSS -------------------------------------------------------------- */
function minifyCss(css) {
  let out = '';
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '"' || c === "'") { // copy strings verbatim
      let j = i + 1;
      while (j < css.length && css[j] !== c) j += css[j] === '\\' ? 2 : 1;
      out += css.slice(i, j + 1);
      i = j;
    } else if (c === '/' && css[i + 1] === '*') { // drop comments
      const end = css.indexOf('*/', i + 2);
      i = end < 0 ? css.length : end + 1;
    } else if (/\s/.test(c)) { // collapse whitespace to one space
      while (i + 1 < css.length && /\s/.test(css[i + 1])) i++;
      out += ' ';
    } else out += c;
  }
  // Remove spaces only where they never matter: around { } ; and commas.
  // (Spaces around : > + - ~ are kept: they matter in selectors and calc().)
  return out
    .replace(/\s*([{};,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim() + '\n';
}

/* ---- JS --------------------------------------------------------------- */
// Removes comments, indentation and blank lines. Line breaks are kept, so
// automatic semicolon insertion behaves exactly as in the source.
function minifyJs(src) {
  let out = '';
  let i = 0;
  let lastSig = ''; // last non-space code character, to tell regex from division
  let lastWord = '';
  const templateDepth = []; // brace depth for each open ${ inside a template
  const regexAfter = /[(,=:[!&|?{};+\-*%<>~^]/;
  const regexKeywords = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'instanceof', 'yield', 'await']);

  const copyString = (q) => {
    let j = i + 1;
    while (j < src.length && src[j] !== q) j += src[j] === '\\' ? 2 : 1;
    out += src.slice(i, j + 1);
    i = j + 1;
    lastSig = q;
  };
  const copyTemplate = () => { // from ` (or from } closing a ${) to ` or ${
    let j = i + 1;
    while (j < src.length) {
      if (src[j] === '\\') { j += 2; continue; }
      if (src[j] === '`') { out += src.slice(i, j + 1); i = j + 1; lastSig = '`'; return; }
      if (src[j] === '$' && src[j + 1] === '{') { out += src.slice(i, j + 2); i = j + 2; templateDepth.push(0); lastSig = '{'; return; }
      j++;
    }
    out += src.slice(i); i = src.length;
  };

  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (c === '"' || c === "'") { copyString(c); lastWord = ''; continue; }
    if (c === '`') { copyTemplate(); lastWord = ''; continue; }
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; out += ' '; continue; }
    if (c === '/' && (lastSig === '' || regexAfter.test(lastSig) || regexKeywords.has(lastWord))) { // regex literal
      let j = i + 1;
      let inClass = false;
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === '[') inClass = true;
        else if (src[j] === ']') inClass = false;
        else if (src[j] === '/' && !inClass) break;
        j++;
      }
      j++;
      while (/[a-z]/i.test(src[j] || '')) j++; // flags
      out += src.slice(i, j);
      i = j;
      lastSig = '/'; lastWord = '';
      continue;
    }
    if (templateDepth.length) {
      if (c === '{') templateDepth[templateDepth.length - 1]++;
      if (c === '}') {
        if (templateDepth[templateDepth.length - 1] === 0) { templateDepth.pop(); copyTemplateFromBrace(); continue; }
        templateDepth[templateDepth.length - 1]--;
      }
    }
    out += c;
    if (/\S/.test(c)) {
      lastSig = c;
      lastWord = /[\w$]/.test(c) ? (/[\w$]/.test(out[out.length - 2] || '') ? lastWord + c : c) : '';
    }
    i++;
  }

  function copyTemplateFromBrace() { // i points at the } that closes ${ ... }
    out += '}';
    let j = i + 1;
    while (j < src.length) {
      if (src[j] === '\\') { j += 2; continue; }
      if (src[j] === '`') { out += src.slice(i + 1, j + 1); i = j + 1; lastSig = '`'; return; }
      if (src[j] === '$' && src[j + 1] === '{') { out += src.slice(i + 1, j + 2); i = j + 2; templateDepth.push(0); lastSig = '{'; return; }
      j++;
    }
    out += src.slice(i + 1); i = src.length;
  }

  // Strip indentation, trailing spaces and blank lines. Template literals
  // that span lines would be affected, so leave any line inside one alone.
  const lines = out.split('\n');
  const result = [];
  let inTemplate = false;
  for (const line of lines) {
    const ticks = (line.replace(/\\`/g, '').match(/`/g) || []).length;
    const keep = inTemplate;
    if (ticks % 2 === 1) inTemplate = !inTemplate;
    if (keep) { result.push(line); continue; }
    const t = line.trim();
    if (t) result.push(t);
  }
  return result.join('\n') + '\n';
}

/* ---- Build ------------------------------------------------------------ */
const versions = {};
for (const b of BUNDLES) {
  const source = b.src.map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join(b.type === 'js' ? '\n;\n' : '\n');
  const min = b.type === 'css' ? minifyCss(source) : minifyJs(source);
  if (b.type === 'js') new Function(min); // throws on a syntax error
  fs.writeFileSync(path.join(ROOT, b.out), min);
  versions[b.out] = crypto.createHash('sha256').update(min).digest('hex').slice(0, 8);
  const before = Buffer.byteLength(source);
  const after = Buffer.byteLength(min);
  console.log(`${b.out.padEnd(30)} ${(before / 1024).toFixed(1).padStart(6)} KB -> ${(after / 1024).toFixed(1).padStart(6)} KB (${Math.round((1 - after / before) * 100)}% smaller)`);
}

/* ---- Rewrite references ------------------------------------------------ */
const v = (f) => `/${f}?v=${versions[f]}`;
function rewrite(html) {
  return html
    // four global stylesheets -> one bundle
    .replace(/<link rel="stylesheet" href="\/assets\/css\/base\.css">\s*<link rel="stylesheet" href="\/assets\/css\/layout\.css">\s*<link rel="stylesheet" href="\/assets\/css\/components\.css">\s*<link rel="stylesheet" href="\/assets\/css\/animations\.css">/,
      `<link rel="stylesheet" href="${v('assets/css/site.min.css')}">`)
    .replace(/\/assets\/css\/site\.min\.css(\?v=\w+)?/g, v('assets/css/site.min.css'))
    .replace(/\/assets\/css\/pages(\.min)?\.css(\?v=\w+)?/g, v('assets/css/pages.min.css'))
    // main + animations -> one bundle
    .replace(/<script src="\/assets\/js\/main\.js" defer><\/script>\s*<script src="\/assets\/js\/animations\.js" defer><\/script>/,
      `<script src="${v('assets/js/site.min.js')}" defer></script>`)
    .replace(/\/assets\/js\/site\.min\.js(\?v=\w+)?/g, v('assets/js/site.min.js'))
    .replace(/\/assets\/js\/components(\.min)?\.js(\?v=\w+)?/g, v('assets/js/components.min.js'))
    .replace(/\/assets\/js\/forms(\.min)?\.js(\?v=\w+)?/g, v('assets/js/forms.min.js'));
}

function findPages(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findPages(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

let changed = 0;
for (const file of findPages(ROOT)) { // includes partials/*.html
  const html = fs.readFileSync(file, 'utf8');
  const next = rewrite(html);
  if (next !== html) { fs.writeFileSync(file, next); changed++; }
}
console.log(`references updated in ${changed} file(s)`);
execFileSync(process.execPath, [path.join(__dirname, 'sync-layout.js')], { cwd: ROOT, stdio: 'inherit' });
