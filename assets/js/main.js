/* ==========================================================================
   Vastu Interior — main.js
   Preloader (once per session), sticky header, mobile menu, active nav,
   floating contact buttons, footer year. No dependencies.
   Events for animations.js:
     vi:ready  — fired on document when the page is ready to animate
                 (after the preloader lifts, or immediately).
     vi:menu   — fired on document with detail.open when the menu toggles.
   ========================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  const PRELOAD_KEY = 'vi-preloaded';
  const desktop = window.matchMedia('(min-width: 1024px)');

  /* Preloader -------------------------------------------------------------
     Modelled on the reference loader (docs/REFERENCE-NOTES.md §2):
     1. brand letters rise in (y 10px -> 0, staggered),
     2. line + counter follow REAL loading progress (eager images, web fonts,
        window load), never faster than a quad-out time floor of MIN ms,
     3. page reveal starts (vi:ready), then the panel lifts with a curved edge.
     Runs once per session; skipped under reduced motion (no html.motion-ok).
     Closes by MAX ms no matter what; the CSS failsafe covers a dead script. */
  const EASE_QUAD_OUT = 'cubic-bezier(0.5, 1, 0.89, 1)';      // GSAP power1.out
  const EASE_QUART_IN_OUT = 'cubic-bezier(0.76, 0, 0.24, 1)'; // GSAP power3.inOut

  function initPreloader() {
    const el = document.querySelector('[data-preloader]');
    let readyFired = false;
    const ready = () => {
      if (readyFired) return;
      readyFired = true;
      window.viReady = true;
      document.dispatchEvent(new Event('vi:ready'));
    };

    const shouldRun = el && typeof el.animate === 'function' &&
      root.classList.contains('motion-ok') && !root.classList.contains('preloaded');
    if (!shouldRun) {
      root.classList.add('preloader-done');
      ready();
      return;
    }

    // All times are ms since navigation start (performance.now()), because the
    // overlay is on screen from first paint, before this script runs.
    const MIN = 2000;    // shortest run, so it never flashes
    const MAX = 5000;    // always fully closed by now
    const EXIT = 600;    // panel lift
    const LEAD = 630;    // hero reveal starts this long before the lift (reference)
    const HOLD = 120;    // pause at 100%
    const FORCE_AT = MAX - EXIT - LEAD - HOLD - 350;   // push to 100% in time

    // Script arrived too late to animate and still close by MAX: just go.
    if (performance.now() > FORCE_AT + 250) {
      el.hidden = true;
      root.classList.add('preloader-done');
      try { sessionStorage.setItem(PRELOAD_KEY, '1'); } catch (e) { /* storage blocked */ }
      ready();
      return;
    }

    const panel = el.querySelector('.preloader__panel');
    const brand = el.querySelector('.preloader__brand');
    const line = el.querySelector('.preloader__line');
    const num = el.querySelector('.preloader__num');
    const curve = el.querySelector('.preloader__curve');
    root.classList.add('is-preloading');

    // 1. Brand letters
    const chars = [...brand.textContent].map((ch) => {
      const span = document.createElement('span');
      span.className = 'preloader__char';
      span.textContent = ch === ' ' ? String.fromCharCode(160) : ch;
      return span;
    });
    brand.replaceChildren(...chars);
    chars.forEach((c, i) => {
      c.animate(
        [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
        { duration: 700, delay: 100 + i * 35, easing: EASE_QUAD_OUT, fill: 'forwards' },
      );
    });

    // 2. Real loading progress
    let loaded = 0;
    const tasks = [];
    const track = (promise) => tasks.push(promise.then(() => { loaded += 1; }, () => { loaded += 1; }));
    [...document.images]
      .filter((img) => !el.contains(img) && img.loading !== 'lazy')
      .forEach((img) => track(img.complete ? Promise.resolve() : new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      })));
    if (document.fonts && document.fonts.ready) track(document.fonts.ready);
    track(document.readyState === 'complete' ? Promise.resolve()
      : new Promise((resolve) => window.addEventListener('load', resolve, { once: true })));
    const total = tasks.length;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      el.hidden = true;
      root.classList.add('preloader-done');
      root.classList.remove('is-preloading');
      try { sessionStorage.setItem(PRELOAD_KEY, '1'); } catch (e) { /* storage blocked */ }
    };

    // 3. Exit: reveal the page underneath, then lift the panel.
    const exit = () => {
      ready();
      setTimeout(() => {
        const opts = { duration: EXIT, easing: EASE_QUART_IN_OUT, fill: 'forwards' };
        panel.animate(
          [{ transform: 'none' }, { transform: 'translateY(calc(-100% - 14vw - 2px))' }],
          opts,
        );
        curve.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], opts)
          .finished.then(finish, finish);
      }, LEAD);
    };

    let shown = 0;
    const quadOut = (t) => 1 - (1 - t) * (1 - t);
    const tick = (now) => {
      const forced = now >= FORCE_AT;
      const floor = quadOut(Math.min(1, now / MIN));
      const real = total ? loaded / total : 1;
      const target = forced ? 1 : Math.min(real, floor);
      shown += (target - shown) * (forced ? 0.3 : 0.12);
      if (target === 1 && 1 - shown < 0.01) shown = 1;
      num.textContent = String(Math.floor(shown * 100));
      line.style.transform = `scaleX(${shown})`;
      if (shown === 1) {
        setTimeout(exit, HOLD);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // Hard stop: whatever happened, the loader is gone by MAX.
    setTimeout(() => { ready(); finish(); }, Math.max(0, MAX - performance.now()));
  }

  /* Sticky header: hide on scroll down, show on scroll up ------------------ */
  const header = document.querySelector('[data-header]');
  const floatActions = document.querySelector('[data-float-actions]');
  let lastY = window.scrollY;
  let ticking = false;
  let footerVisible = false;

  function onScroll() {
    const y = Math.max(0, window.scrollY);
    const menuOpen = root.classList.contains('menu-open');

    if (header) {
      header.classList.toggle('is-scrolled', y > 8);
      const delta = y - lastY;
      if (Math.abs(delta) > 6) {
        const hide = delta > 0 && y > header.offsetHeight * 2 && !menuOpen &&
          !header.contains(document.activeElement);
        header.classList.toggle('is-hidden', hide);
        lastY = y;
      }
    }

    if (floatActions) {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const threshold = Math.min(320, maxScroll * 0.5);
      floatActions.classList.toggle('is-hidden', (maxScroll > 0 && y < threshold) || footerVisible);
    }
    ticking = false;
  }

  function requestScrollUpdate() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  }

  function initHeader() {
    if (header) {
      header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
    }
    // Keep floating buttons off the footer's own contact links.
    const footerBottom = document.querySelector('.footer-bottom');
    if (floatActions && footerBottom && 'IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        footerVisible = entry.isIntersecting;
        requestScrollUpdate();
      }).observe(footerBottom);
    }
    window.addEventListener('scroll', requestScrollUpdate, { passive: true });
    window.addEventListener('resize', requestScrollUpdate, { passive: true });
    onScroll();
  }

  /* Full-screen mobile menu ----------------------------------------------- */
  function initMenu() {
    const toggle = document.querySelector('[data-menu-toggle]');
    const menu = document.querySelector('[data-menu]');
    if (!toggle || !menu) return;
    const label = toggle.querySelector('.menu-toggle__label');

    const focusables = () =>
      [...document.querySelectorAll('.site-header a, .site-header button, [data-menu] a, [data-menu] button')]
        .filter((n) => n.offsetParent !== null || n === toggle);

    const setOpen = (open) => {
      menu.inert = !open;
      menu.classList.toggle('is-open', open);
      root.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (label) label.textContent = open ? 'Close menu' : 'Open menu';
      if (header) header.classList.remove('is-hidden');
      document.dispatchEvent(new CustomEvent('vi:menu', { detail: { open } }));
      if (open) {
        const first = menu.querySelector('a');
        if (first) setTimeout(() => first.focus({ preventScroll: true }), 300);
      } else if (menu.contains(document.activeElement)) {
        toggle.focus({ preventScroll: true });
      }
    };
    const isOpen = () => menu.classList.contains('is-open');

    toggle.addEventListener('click', () => setOpen(!isOpen()));
    menu.addEventListener('click', (e) => {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (!isOpen()) return;
      if (e.key === 'Escape') {
        setOpen(false);
        toggle.focus();
        return;
      }
      if (e.key === 'Tab') {
        const items = focusables();
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
    desktop.addEventListener('change', (e) => { if (e.matches && isOpen()) setOpen(false); });
  }

  /* Active nav link -------------------------------------------------------- */
  function normalise(path) {
    let p = path.replace(/index\.html$/, '').replace(/\.html$/, '');
    if (p.length > 1) p = p.replace(/\/$/, '');
    return p || '/';
  }

  function initActiveNav() {
    const here = normalise(window.location.pathname);
    document.querySelectorAll('.site-nav__link, .menu__link, .footer-links a').forEach((a) => {
      const url = new URL(a.getAttribute('href'), window.location.href);
      if (url.origin !== window.location.origin) return;
      const p = normalise(url.pathname);
      if (p === here) {
        a.setAttribute('aria-current', 'page');
        a.classList.add('is-active');
      } else if (p !== '/' && here.startsWith(p + '/')) {
        a.classList.add('is-active');
      }
    });
  }

  /* Footer year ------------------------------------------------------------ */
  function initYear() {
    const year = String(new Date().getFullYear());
    document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = year; });
  }

  /* Hero background video ---------------------------------------------------
     The poster <img> is what loads first (and what search engines and LCP see).
     The muted video only starts once the page is ready (after the preloader),
     fades in when frames are actually playing, pauses when scrolled out of
     view or the tab is hidden, and never loads under reduced motion or Data
     Saver. preload="none" in the HTML keeps it from competing with the page. */
  function initHeroVideo() {
    const video = document.querySelector('[data-hero-video]');
    if (!video) return;
    if (navigator.connection && navigator.connection.saveData) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let ready = false;
    let inView = true;

    const play = () => {
      if (!ready || !inView || document.hidden || reduce.matches) return;
      const p = video.play();
      if (p && p.catch) p.catch(() => { /* autoplay refused: poster stays */ });
    };
    const pause = () => { if (!video.paused) video.pause(); };

    video.addEventListener('playing', () => video.classList.add('is-playing'));
    reduce.addEventListener('change', (e) => {
      if (e.matches) { pause(); video.classList.remove('is-playing'); } else play();
    });
    document.addEventListener('visibilitychange', () => (document.hidden ? pause() : play()));
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        if (inView) play(); else pause();
      }).observe(video);
    }
    const start = () => { ready = true; play(); };
    if (window.viReady) start();
    else document.addEventListener('vi:ready', start, { once: true });
  }

  initPreloader();
  initHeader();
  initMenu();
  initActiveNav();
  initYear();
  initHeroVideo();
})();
