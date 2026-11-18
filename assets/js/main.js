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

  /* Preloader ------------------------------------------------------------- */
  function initPreloader() {
    const el = document.querySelector('.preloader');
    const shouldRun =
      el && root.classList.contains('motion-ok') && !root.classList.contains('preloaded');

    const ready = () => {
      root.classList.remove('is-preloading');
      window.viReady = true;
      document.dispatchEvent(new Event('vi:ready'));
    };

    if (!shouldRun) {
      ready();
      return;
    }

    root.classList.add('is-preloading');
    const bar = el.querySelector('.preloader__progress');
    const started = performance.now();
    const MIN = 1200;
    const MAX = 3000;
    let finished = false;

    requestAnimationFrame(() => { if (bar) bar.style.transform = 'scaleX(0.4)'; });

    const finish = () => {
      if (finished) return;
      finished = true;
      if (bar) bar.style.transform = 'scaleX(1)';
      const wait = Math.max(0, MIN - (performance.now() - started));
      setTimeout(() => {
        el.classList.add('is-done');
        try { sessionStorage.setItem(PRELOAD_KEY, '1'); } catch (e) { /* storage blocked */ }
        ready();
        el.addEventListener('transitionend', () => { el.hidden = true; }, { once: true });
      }, wait + 300);
    };

    if (document.readyState === 'complete') finish();
    else window.addEventListener('load', finish, { once: true });
    setTimeout(finish, MAX);
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

  initPreloader();
  initHeader();
  initMenu();
  initActiveNav();
  initYear();
})();
