/* ==========================================================================
   Vastu Interior — components.js
   Interactive components that work without GSAP:
     [data-slider]          accessible slider (buttons, arrow keys, swipe)
     [data-service-preview] image preview that follows the cursor over
                            service rows (fine pointers only)
   Movement uses transform / translate and opacity only.
   ========================================================================== */
(() => {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pad = (n) => String(n).padStart(2, '0');

  /* Slider ------------------------------------------------------------------ */
  function initSlider(root) {
    const track = root.querySelector('.slider__track');
    const viewport = root.querySelector('.slider__viewport');
    if (!track || !viewport) return;
    const slides = [...track.children];
    const total = slides.length;
    const current = root.querySelector('[data-slider-current]');
    const bar = root.querySelector('[data-slider-bar]');
    const status = root.querySelector('[data-slider-status]');
    let index = 0;

    const go = (next, announce = true) => {
      index = (next + total) % total;
      track.style.transform = `translateX(${-index * 100}%)`;
      slides.forEach((slide, i) => {
        const hidden = i !== index;
        slide.inert = hidden;
        slide.setAttribute('aria-hidden', String(hidden));
      });
      if (current) current.textContent = pad(index + 1);
      if (bar) bar.style.transform = `scaleX(${(index + 1) / total})`;
      if (announce && status) status.textContent = `Testimonial ${index + 1} of ${total}`;
    };

    root.querySelector('[data-slider-prev]')?.addEventListener('click', () => go(index - 1));
    root.querySelector('[data-slider-next]')?.addEventListener('click', () => go(index + 1));
    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
    });

    // Swipe: horizontal drags of 40px or more change slide; vertical scroll is left alone.
    let startX = null;
    let startY = null;
    viewport.addEventListener('pointerdown', (e) => { startX = e.clientX; startY = e.clientY; });
    viewport.addEventListener('pointerup', (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(index + (dx < 0 ? 1 : -1));
      startX = null;
    });
    viewport.addEventListener('pointercancel', () => { startX = null; });

    go(0, false);
  }

  /* Service row image preview ---------------------------------------------- */
  function initServicePreview(list) {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const rows = [...list.querySelectorAll('[data-preview]')];
    if (!rows.length) return;

    const box = document.createElement('div');
    box.className = 'service-preview';
    box.setAttribute('aria-hidden', 'true');
    const imgs = rows.map((row) => {
      const img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      img.dataset.src = row.dataset.preview;
      box.append(img);
      return img;
    });
    document.body.append(box);

    // Fetch preview images only when the list comes near the viewport.
    let loaded = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      imgs.forEach((img) => { img.src = img.dataset.src; });
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { load(); io.disconnect(); }
      }, { rootMargin: '400px 0px' });
      io.observe(list);
    } else {
      load();
    }

    let x = 0, y = 0, tx = 0, ty = 0, raf = 0, placed = false;
    const ease = () => (reduce.matches ? 1 : 0.18);
    const tick = () => {
      x += (tx - x) * ease();
      y += (ty - y) * ease();
      box.style.translate = `${x}px ${y}px`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(tick) : 0;
    };
    list.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX;
      ty = e.clientY;
      if (!placed) { x = tx; y = ty; placed = true; }
      if (!raf) raf = requestAnimationFrame(tick);
    });
    rows.forEach((row, i) => {
      row.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse') return;
        load();
        imgs.forEach((img, k) => img.classList.toggle('is-active', k === i));
        box.classList.add('is-visible');
      });
    });
    list.addEventListener('pointerleave', () => {
      box.classList.remove('is-visible');
      placed = false;
    });
  }

  /* Accordion --------------------------------------------------------------
     Native <details data-accordion>. Opening fades/slides the panel in (CSS
     keyframe); closing fades it out first, then collapses. Opacity and
     transform only; instant under reduced motion. */
  function initAccordion(item) {
    const summary = item.querySelector('summary');
    const panel = item.querySelector('.accordion__panel');
    if (!summary || !panel || typeof panel.animate !== 'function') return;
    let closing = false;
    summary.addEventListener('click', (e) => {
      if (!item.open || closing || reduce.matches) return;
      e.preventDefault();
      closing = true;
      const anim = panel.animate(
        [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-0.5rem)' }],
        { duration: 200, easing: 'cubic-bezier(0.4, 0, 1, 1)' },
      );
      anim.onfinish = () => { item.open = false; closing = false; };
    });
  }

  /* Step index (process page) ----------------------------------------------
     [data-step-nav]: marks the link for the step nearest the middle of the
     viewport. Works with or without GSAP. */
  function initStepNav(nav) {
    const links = [...nav.querySelectorAll('a[href^="#"]')];
    const steps = links.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
    if (!steps.length || !('IntersectionObserver' in window)) return;
    const setActive = (i) => links.forEach((a, k) => {
      a.classList.toggle('is-active', k === i);
      if (k === i) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setActive(steps.indexOf(entry.target)); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    steps.forEach((s) => io.observe(s));
    setActive(0);
  }

  document.querySelectorAll('[data-slider]').forEach(initSlider);
  document.querySelectorAll('[data-service-preview]').forEach(initServicePreview);
  document.querySelectorAll('details[data-accordion]').forEach(initAccordion);
  document.querySelectorAll('[data-step-nav]').forEach(initStepNav);
})();
