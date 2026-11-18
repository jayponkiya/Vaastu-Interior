/* ==========================================================================
   Vastu Interior — animations.js
   Lenis smooth scroll + GSAP ScrollTrigger. Data-attribute driven:
     data-reveal="fade|fade-up|mask|stagger"   (+ optional data-delay="0.2")
     data-split                                 headings split into words
     data-parallax="0.12"                       image inside .media (0–0.16)
     data-count="250" data-prefix="" data-suffix="+"   counters
     data-cursor="View"                         cursor label on hover
   Does nothing unless html.motion-ok is set (JS on, no reduced motion).
   Animates transform and opacity only.
   ========================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (!root.classList.contains('motion-ok') || reduceQuery.matches) return;
  if (!window.gsap || !window.ScrollTrigger) {
    root.classList.remove('motion-ok');
    return;
  }

  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('motion-ready');

  /* Smooth scroll ---------------------------------------------------------- */
  let lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    if (root.classList.contains('is-preloading')) lenis.stop();

    document.addEventListener('vi:menu', (e) => (e.detail.open ? lenis.stop() : lenis.start()));

    // In-page anchors scroll smoothly (skip link keeps native focus behaviour).
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.classList.contains('skip-link')) return;
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.getElementById(decodeURIComponent(id.slice(1)));
      if (!target) return;
      e.preventDefault();
      const header = document.querySelector('[data-header]');
      lenis.scrollTo(target, { offset: header ? -header.offsetHeight : 0 });
      history.replaceState(null, '', id);
    });
  }

  /* Split text ------------------------------------------------------------- */
  function splitWords(node) {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.append(document.createTextNode(' '));
            return;
          }
          const outer = document.createElement('span');
          const inner = document.createElement('span');
          outer.className = 'split-word';
          outer.setAttribute('aria-hidden', 'true');
          inner.className = 'split-word__inner';
          inner.textContent = part;
          outer.append(inner);
          frag.append(outer);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
        splitWords(child);
      }
    });
  }

  function initSplit() {
    gsap.utils.toArray('[data-split]').forEach((el) => {
      el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
      splitWords(el);
      const words = el.querySelectorAll('.split-word__inner');
      gsap.set(words, { yPercent: 110 });
      gsap.set(el, { opacity: 1 });
      gsap.to(words, {
        yPercent: 0,
        duration: 1.1,
        ease: 'power4.out',
        stagger: 0.06,
        delay: parseFloat(el.dataset.delay) || 0,
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      });
    });
  }

  /* Reveals ---------------------------------------------------------------- */
  function initReveals() {
    gsap.utils.toArray('[data-reveal]').forEach((el) => {
      const type = el.dataset.reveal;
      const delay = parseFloat(el.dataset.delay) || 0;
      const trigger = { trigger: el, start: 'top 88%', once: true };

      switch (type) {
        case 'fade':
          gsap.to(el, { opacity: 1, duration: 1.2, ease: 'power2.out', delay, scrollTrigger: trigger });
          break;
        case 'fade-up':
          gsap.to(el, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', delay, scrollTrigger: trigger });
          break;
        case 'stagger':
          gsap.to(el.children, {
            opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.09, delay, scrollTrigger: trigger,
          });
          break;
        case 'mask':
          ScrollTrigger.create({
            ...trigger,
            start: 'top 85%',
            onEnter: () => gsap.delayedCall(delay, () => el.classList.add('is-revealed')),
          });
          break;
        default:
          gsap.set(el, { opacity: 1, y: 0 });
      }
    });
  }

  /* Parallax --------------------------------------------------------------- */
  function initParallax() {
    gsap.utils.toArray('[data-parallax]').forEach((img) => {
      const amount = Math.min(parseFloat(img.dataset.parallax) || 0.12, 0.16);
      gsap.fromTo(
        img,
        { yPercent: -amount * 50 },
        {
          yPercent: amount * 50,
          ease: 'none',
          scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      );
    });
  }

  /* Counters --------------------------------------------------------------- */
  function initCounters() {
    gsap.utils.toArray('[data-count]').forEach((el) => {
      const raw = el.dataset.count;
      const end = parseFloat(raw);
      if (Number.isNaN(end)) return;
      const decimals = (raw.split('.')[1] || '').length;
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const format = (v) =>
        prefix + v.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;

      // Lock the final width so changing digits never shifts layout.
      // Measured in em so it stays right when fluid type resizes.
      el.textContent = format(end);
      el.style.display = 'inline-block';
      el.style.justifySelf = 'start';
      el.style.width = 'max-content';
      const em = parseFloat(getComputedStyle(el).fontSize);
      el.style.minWidth = `${(el.getBoundingClientRect().width / em).toFixed(3)}em`;
      el.style.width = '';

      const state = { v: 0 };
      el.textContent = format(0);
      gsap.to(state, {
        v: end,
        duration: 2,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        onUpdate: () => { el.textContent = format(state.v); },
      });
    });
  }

  /* Custom cursor ---------------------------------------------------------- */
  function initCursor() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const cursor = document.createElement('div');
    cursor.className = 'cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = '<div class="cursor__dot"><span class="cursor__label"></span></div>';
    document.body.append(cursor);
    const label = cursor.querySelector('.cursor__label');

    const xTo = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' });
    const yTo = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' });

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      xTo(e.clientX);
      yTo(e.clientY);
      cursor.classList.add('is-visible');
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));

    document.addEventListener('pointerover', (e) => {
      const labelled = e.target.closest('[data-cursor]');
      const interactive = e.target.closest('a, button, summary, label, select, input, textarea');
      cursor.classList.toggle('is-label', Boolean(labelled));
      cursor.classList.toggle('is-link', !labelled && Boolean(interactive));
      if (labelled) label.textContent = labelled.dataset.cursor;
    });
  }

  /* Turn everything off if the visitor switches on reduced motion ---------- */
  function disableAll() {
    ScrollTrigger.getAll().forEach((t) => t.kill());
    gsap.killTweensOf('*');
    if (lenis) lenis.destroy();
    document.querySelectorAll('.cursor').forEach((c) => c.remove());
    document.querySelectorAll('[data-reveal], [data-reveal="stagger"] > *, [data-split], .split-word__inner, [data-parallax]')
      .forEach((el) => gsap.set(el, { clearProps: 'all' }));
    document.querySelectorAll('[data-reveal="mask"]').forEach((el) => el.classList.add('is-revealed'));
    document.querySelectorAll('[data-count]').forEach((el) => {
      el.textContent = (el.dataset.prefix || '') +
        parseFloat(el.dataset.count).toLocaleString('en-IN') + (el.dataset.suffix || '');
    });
    root.classList.remove('motion-ok', 'motion-ready');
  }
  reduceQuery.addEventListener('change', (e) => { if (e.matches) disableAll(); });

  /* Start ------------------------------------------------------------------ */
  // Everything starts once the preloader has lifted (or right away if none).
  // Until then motion-ok keeps reveal targets at opacity 0, so nothing flashes.
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    if (lenis) lenis.start();
    initSplit();
    initReveals();
    initParallax();
    initCounters();
    initCursor();
    ScrollTrigger.refresh();
  };

  if (window.viReady) start();
  else document.addEventListener('vi:ready', start, { once: true });
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
})();
