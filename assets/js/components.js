/* ==========================================================================
   Vastu Interior — components.js
   Interactive components that work without GSAP:
     [data-slider]          accessible slider (buttons, arrow keys, swipe)
     [data-service-preview] image preview that follows the cursor over
                            service rows (fine pointers only)
     [data-filter-root]     project filter tabs
     [data-lightbox]        gallery lightbox (native dialog)
     [data-compare]         before / after slider
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

  /* Project filter -----------------------------------------------------------
     [data-filter] buttons (aria-pressed) filter [data-filter-grid] cards by
     data-category. Cards fade out, the set changes, the new set fades up in a
     stagger. Opacity and transform only; instant under reduced motion. The
     wide/narrow rhythm is re-applied to the visible cards. */
  function applyRhythm(cards) {
    // pairs of 7 + 5 columns, alternating sides: wide, narrow / narrow, wide
    cards.forEach((card, i) => {
      const wide = Math.floor(i / 2) % 2 === 0 ? i % 2 === 0 : i % 2 === 1;
      card.classList.toggle('is-wide', wide);
      card.classList.toggle('is-narrow', !wide);
    });
  }
  function initFilter(root) {
    const grid = root.querySelector('[data-filter-grid]');
    const buttons = [...root.querySelectorAll('[data-filter]')];
    const count = root.querySelector('[data-filter-count]');
    if (!grid || !buttons.length) return;
    const cards = [...grid.children];
    let busy = null;
    applyRhythm(cards);

    const show = (cat) => {
      const visible = cards.filter((c) => cat === 'all' || c.dataset.category === cat);
      cards.forEach((c) => { c.hidden = !visible.includes(c); });
      applyRhythm(visible);
      if (count) count.textContent = `${visible.length} ${visible.length === 1 ? 'project' : 'projects'}`;
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      return visible;
    };

    buttons.forEach((btn) => btn.addEventListener('click', () => {
      if (btn.getAttribute('aria-pressed') === 'true') return;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      const cat = btn.dataset.filter;
      // Take the cards out of the scroll reveal so the filter owns them now.
      if (window.gsap) { window.gsap.killTweensOf(cards); window.gsap.set(cards, { opacity: 1, y: 0 }); }
      if (reduce.matches || typeof grid.animate !== 'function') { show(cat); return; }

      const token = {};
      busy = token;
      const current = cards.filter((c) => !c.hidden);
      const outs = current.map((c) => c.animate(
        [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(1rem)' }],
        { duration: 220, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' },
      ));
      Promise.all(outs.map((a) => a.finished.catch(() => {}))).then(() => {
        if (busy !== token) return;
        outs.forEach((a) => a.cancel());
        show(cat).forEach((c, i) => c.animate(
          [{ opacity: 0, transform: 'translateY(2rem)' }, { opacity: 1, transform: 'none' }],
          { duration: 600, delay: i * 80, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' },
        ));
      });
    }));
  }

  /* Lightbox ---------------------------------------------------------------
     [data-lightbox] groups <a href="large.webp"> links. Opens a native
     <dialog> (Esc closes, focus returns), arrow keys and buttons step
     through, swipe on touch. Image changes fade (opacity + transform). */
  const icon = (d) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  let lightbox = null;
  function getLightbox() {
    if (lightbox) return lightbox;
    const dlg = document.createElement('dialog');
    dlg.className = 'lightbox';
    dlg.setAttribute('aria-label', 'Image viewer');
    dlg.setAttribute('data-lenis-prevent', '');
    dlg.innerHTML = `
      <div class="lightbox__bar"><span class="lightbox__count" aria-live="polite"></span>
        <button class="lightbox__btn" type="button" data-lb="close" aria-label="Close image viewer">${icon('M6 6l12 12M18 6 6 18')}</button></div>
      <div class="lightbox__stage"><img class="lightbox__img" alt=""></div>
      <div class="lightbox__foot"><p class="lightbox__caption"></p>
        <div class="lightbox__nav">
          <button class="lightbox__btn" type="button" data-lb="prev" aria-label="Previous image">${icon('M15 18 9 12l6-6')}</button>
          <button class="lightbox__btn" type="button" data-lb="next" aria-label="Next image">${icon('m9 18 6-6-6-6')}</button>
        </div></div>`;
    document.body.append(dlg);
    const img = dlg.querySelector('.lightbox__img');
    const state = { items: [], index: 0, opener: null };

    const render = (dir = 0) => {
      const a = state.items[state.index];
      const thumb = a.querySelector('img');
      img.src = a.href;
      img.alt = thumb ? thumb.alt : '';
      dlg.querySelector('.lightbox__caption').textContent = thumb ? thumb.alt : '';
      dlg.querySelector('.lightbox__count').textContent = `${pad(state.index + 1)} / ${pad(state.items.length)}`;
      if (!reduce.matches && typeof img.animate === 'function') {
        img.animate(
          [{ opacity: 0, transform: `translateX(${dir * 2}rem) scale(0.98)` }, { opacity: 1, transform: 'none' }],
          { duration: 380, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        );
      }
    };
    const step = (d) => {
      state.index = (state.index + d + state.items.length) % state.items.length;
      render(d);
    };
    dlg.addEventListener('click', (e) => {
      const action = e.target.closest('[data-lb]')?.dataset.lb;
      if (action === 'close') dlg.close();
      else if (action === 'prev') step(-1);
      else if (action === 'next') step(1);
      else if (e.target === dlg || e.target.classList.contains('lightbox__stage')) dlg.close();
    });
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    });
    let x0 = null;
    dlg.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    dlg.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
      x0 = null;
    });
    dlg.addEventListener('close', () => {
      document.documentElement.classList.remove('has-lightbox');
      if (state.opener) state.opener.focus();
    });
    lightbox = {
      open(items, index, opener) {
        Object.assign(state, { items, index, opener });
        render();
        dlg.showModal();
        document.documentElement.classList.add('has-lightbox');
        dlg.querySelector('[data-lb="next"]').focus();
      },
    };
    return lightbox;
  }
  function initLightbox(group) {
    const items = [...group.querySelectorAll('a[href]')];
    items.forEach((a, i) => a.addEventListener('click', (e) => {
      if (typeof HTMLDialogElement !== 'function') return; // plain link fallback
      e.preventDefault();
      getLightbox().open(items, i, a);
    }));
  }

  /* Before / after slider ---------------------------------------------------
     [data-compare] holds a native range input (keyboard and screen reader
     friendly) laid over the images; its value drives --pos, which moves the
     layers with transform only. */
  function initCompare(root) {
    const range = root.querySelector('input[type="range"]');
    if (!range) return;
    const set = () => {
      root.style.setProperty('--pos', `${range.value}%`);
      range.setAttribute('aria-valuetext', `${range.value}% concept sketch`);
    };
    range.addEventListener('input', set);
    set();
  }

  document.querySelectorAll('[data-slider]').forEach(initSlider);
  document.querySelectorAll('[data-service-preview]').forEach(initServicePreview);
  document.querySelectorAll('details[data-accordion]').forEach(initAccordion);
  document.querySelectorAll('[data-step-nav]').forEach(initStepNav);
  document.querySelectorAll('[data-filter-root]').forEach(initFilter);
  document.querySelectorAll('[data-lightbox]').forEach(initLightbox);
  document.querySelectorAll('[data-compare]').forEach(initCompare);
})();
