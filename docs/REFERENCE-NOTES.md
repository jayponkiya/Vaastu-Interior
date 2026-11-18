# Reference notes: interiia.framer.website

Captured 2026-11-18 with Playwright 1.49.1 (Chromium 131, headless), at 1440×900 and 390×844.
The measuring scripts and raw captures live outside the repo; nothing from the reference site
(fonts, images, code) is copied into this project. Only measurements are recorded here.

Method:
- **Styles:** read with `getComputedStyle`.
- **Font files:** collected from network responses and `document.styleSheets`.
- **Animations:** sampled every animation frame by a `requestAnimationFrame` logger injected
  before page scripts. Screen frames came from a Chrome DevTools screencast, about one every 100 ms.
- **Network conditions:** one run with no throttling, and one at 4 Mbps down with 150 ms latency.

All timings are in milliseconds from the start of navigation, unless stated otherwise.
Ease names use GSAP terms: `power1` = quad, `power2` = cubic, `power3` = quart, `power4` = quint.

---

## 1. Typography

### Font files actually loaded

| File (framerusercontent.com/assets/…) | Family | Weight | Used for |
|---|---|---|---|
| `yUScEiZtXZCqdRimefTfBx1Q4.woff2` | PP Neue Montreal Book | 400 | h1, h2, loader counter |
| `6uIfYl8bnz9kOy3KOuV7PxhFPhA.woff2` | PP Neue Montreal Medium | 500 | body, labels, nav, buttons, loader brand |

The page CSS also declares `@font-face` rules that are never downloaded:
- PP Neue Montreal Bold (700), SemiBold Italic (600) and Italic (400).
- 36 Inter subset files, which are Framer defaults.

Every family has a metric-matched `"… Placeholder"` fallback built on `local("Arial")` with
`size-adjust` and ascent/descent overrides. We use the same technique.

All faces use `font-display: swap`. No `text-transform` is used anywhere: everything is
sentence case, with no uppercase labels.

### Computed styles

| Role | Family / weight | 1440 px: size / line-height | 390 px: size / line-height | Letter-spacing | Colour |
|---|---|---|---|---|---|
| h1 (hero) | Book 400 | 60px / 66px (1.1) | 40px / 44px (1.1) | -0.1px | #FFFFFF on the hero video |
| h2 (section) | Book 400 | 48px / 52.8px (1.1) | 28px / 30.8px (1.1) | 0.3px | #1A1A1A |
| Intro statement (large p, acts as h3) | Medium 500 | 32px / 41.6px (1.3) | 22px / 28.6px (1.3) | 0.3px | #1A1A1A |
| Card / service title | Medium 500 | 20px / 26px (1.3) | 18px / 23.4px (1.3) | 0.3px | #1A1A1A |
| Quote / large body | Medium 500 | 24px / 31.2px (1.3) | — | 0.3px | #FFFFFF |
| Muted large body (stats label) | Medium 500 | 18px / 23.4px (1.3) | 16px / 20.8px | 0.3px | rgba(26,26,26,.7) |
| Body | Medium 500 | 16px / 20.8px (1.3) | 14px / 18.2px (1.3) | 0.3px | #FFFFFF / #1A1A1A |
| Small label ("Introduction") | Medium 500 | 14px / 20.16px (1.44) | 12px / 17.28px (1.44) | 0.5px | #1A1A1A |
| Nav link | Medium 500 | 14px / 1.3em | (burger menu) | 0.02em (0.28px) | #FFFFFF over hero |
| Logo text "Interiia" | Medium 500 | 20px / 26px | 16px / 20.8px | 0.3px | #FFFFFF |
| Text button ("View projects") | Medium 500 | 16px / 1.3em | 14px | 0.01em | #FFFFFF |
| Footer wordmark (second h1) | Book 400 | 60px / 54px (0.9) | 60px | normal | #FFFFFF |

There are no `h3` elements; sub-headings are styled `p` tags. Page background is
`#F6F2EA` and body text is `#1A1A1A`.

### Licensing and the font we use instead

**PP Neue Montreal** is a commercial typeface by Pangram Pangram Foundry. It is free only for
personal trial use, and commercial websites need a paid licence. It is **not** a Google Font, so the
files were not copied.

Closest free alternative: **Inter Tight** (SIL Open Font License 1.1, Google Fonts). Both are
neo-grotesques with a single-storey `g`, straight terminals and low contrast. The comparison was
measured in the browser with the reference's own loaded fonts at 100px, using canvas `measureText`
against 18 Google Font candidates:

| Font | Width error vs PP NM (avg of 5 strings) | x-height vs PP NM | Cap height vs PP NM |
|---|---|---|---|
| **Inter Tight 500** | **0.8 %** | +7.8 % | +1.4 % |
| **Inter Tight 400** | **1.8 %** | +7.8 % | +1.4 % |
| Hanken Grotesk 500 / 400 | 3.4 % / 7.1 % | -2 % | -2.8 % |
| Figtree 500 / 400 | 3.8 % / 7.2 % | -2 % | -2.8 % |
| Instrument Sans 500 / 400 | 6.9 % / 9.9 % | 0 % | 0 % |
| Manrope 400 (previous body font) | 9.5 % | +5.9 % | 0 % |

Inter Tight keeps line lengths, wrapping and the tight, compact texture of the reference almost
exactly. Hanken Grotesk matches x-height better, but sets 3–7 % wider and looks rounder.
Inter Tight's taller x-height makes text read slightly larger at the same pixel size. That is
acceptable, and it slightly helps legibility at the reference's small 14px mobile body size.

Mapping: PP Neue Montreal Book (400) becomes Inter Tight 400, and Medium (500) becomes Inter Tight 500.
The files come from `@fontsource/inter-tight@5.1.1` (static latin subsets, about 22 KB each). The licence is at
`assets/fonts/OFL-inter-tight.txt`.

Fallback metrics against Arial, computed from the woff2 files:

| Fallback for | size-adjust | ascent-override | descent-override | line-gap-override |
|---|---|---|---|---|
| Inter Tight 400 | 96.96 % | 99.91 % | 24.88 % | 0 % |
| Inter Tight 500 | 99.24 % | 97.62 % | 24.31 % | 0 % |

### Fluid scale (390 → 1440 px, linear clamp)

```css
--fs-h1:    clamp(2.5rem,  2.0357rem + 1.9048vw, 3.75rem);  /* 40 → 60 */
--fs-h2:    clamp(1.75rem, 1.2857rem + 1.9048vw, 3rem);     /* 28 → 48 */
--fs-h3:    clamp(1.375rem,1.1429rem + 0.9524vw, 2rem);     /* 22 → 32 */
--fs-h4:    clamp(1.125rem,1.0786rem + 0.1905vw, 1.25rem);  /* 18 → 20 */
--fs-lg:    clamp(1rem,    0.9536rem + 0.1905vw, 1.125rem); /* 16 → 18 */
--fs-base:  clamp(0.875rem,0.8286rem + 0.1905vw, 1rem);     /* 14 → 16 */
--fs-label: clamp(0.75rem, 0.7036rem + 0.1905vw, 0.875rem); /* 12 → 14 */
--lh-tight: 1.1;   /* h1, h2 */
--lh-text:  1.3;   /* h3, h4, body, nav, buttons */
--lh-label: 1.44;
--ls-h1: -0.1px;  --ls-text: 0.3px;  --ls-label: 0.5px;  --ls-nav: 0.02em;  --ls-btn: 0.01em;
```

---

## 2. Preloader

### DOM and layout (1440 × 900)

```
div  position:fixed; inset:0; z-index:10
└ div "container-wrap"   overflow:clip; height:100%
  ├ div "container-mask" position:absolute; left:-10%; width:120%; height:100%;
  │                      background:#1A1A1A; z-index:4; overflow:clip   ← the curtain
  └ div "content-container" background:#1A1A1A; padding:12px; z-index:2;
      display:flex; flex-direction:column; justify-content:center   ← vertically centred block
      ├ "top-block-wrap"  brand text, left aligned            (height 26)
      ├ gap 10px
      ├ "middle"          progress line track, full width     (height 4, overflow clip)
      │   └ "barLine"     #F6F2EA, grows left → right
      ├ gap 10px
      └ "counter-wrapper" justify-content:flex-end; height 160px; overflow clip
          └ span (number) + span "%"   align-items: baseline
```

- **Panel:** background `#1A1A1A`, full viewport, 12px inner padding on all sides.
  Content is a single column centred vertically. Its top sits at y=345 at 1440×900 and at y=318 at 390×844.
- **Brand name:** "Interiia" at the top-left of the column, in PP NM Medium 500.
  It is 20px with 26px line-height and 0.3px letter-spacing at 1440, and 18px / 23.4px at 390. Colour `#F6F2EA`.
  Each letter is its own `inline-block` span, so the letters can stagger.
- **Progress line:** sits 10px under the brand. Its 4px track runs the full content width
  (viewport minus 2 × 12px), and the fill colour is `#F6F2EA`.
- **Counter:** sits 10px under the line, right-aligned to the content edge (12px from the viewport's right).
  - Number: PP NM Book 400, `font-size: 200px; line-height: 0.8em (160px); letter-spacing: -0.06em (-12px)`.
    It is the same 200px at 390 px wide.
  - `%` sign: 48px, `letter-spacing: -0.06em`, aligned to the number's baseline.
  - It reads "0%" in the HTML before any script runs.
- **Scroll:** html and body stay `overflow: visible`, so the loader does not lock scrolling.
  It simply covers the page.

### Timeline (unthrottled run; the throttled run had the same durations, only shifted later)

| t (ms) | Event |
|---|---|
| 0–350 | Blank, then the dark panel with "0%" appears (server-rendered) |
| ~1000 | **Brand letters in:** each letter goes from `y: 10px` to `0`, `opacity` 0 to 1 and `blur` (~10px) to 0. Stagger ≈ 0.05s per letter, each ≈ 0.9s, curve ≈ quad-out (`power1.out`) |
| ~1905 | **Progress starts** (right after the letters settle) |
| 1905 → 4850 | **Line** scales 0 → 100 % width in **2.95s**, ease `power1.out` (quad-out). Measured fills: 31 % at 0.17, 57 % at 0.35, 77 % at 0.53, 91 % at 0.71 and 98 % at 0.89 of the duration |
| 1905 → ~4380 | **Counter** runs 0 → 100 slightly ahead of the line (between cubic-out and quart-out: GSAP `power2.out`–`power3.out`, about 2.5s). It reaches 100 about 0.45s before the line finishes |
| ~4470 | **Hero h1 reveal starts underneath the loader** (see §4) |
| ~4740 | **Exit starts** (about 0.1s after the line completes) |
| 4740 → ~5340 | Curtain lifts (see below), **≈ 0.6s** |
| ~5350 | Loader removed; page fully visible |

Under the 4 Mbps / 150 ms throttle, the letters started at 5.7s (after Framer hydrated) and the line still took
3.0s. The exit finished at about 9.6s. **The counter is a fixed-length timed animation, not real loading
progress.** It only waits for the JavaScript to start.

### Exit animation

- The panel and all its content move **up** together. The content's top goes from 0 to −908px, about 101 % of
  the viewport height.
- At the same time the curtain's bottom edge curves into an ellipse. The curtain is 120 % of the viewport
  wide, and its `border-radius` animates from 0 to 50 %. The result is a convex bottom edge whose
  centre hangs lowest, about 100px below the sides at 1440 wide, as the panel leaves the screen.
- Sampled travel: 1 % at 70ms, 13 % at 230ms, 28 % at 290ms, 46 % at 330ms, 68 % at 350ms, 79 % at 380ms,
  89 % at 410ms, 96 % at 480ms and 99 % at 530ms.
  That fits a quart in-out curve: **GSAP `power3.inOut` over 0.55–0.6s**, which is about `cubic-bezier(0.76, 0, 0.24, 1)`.
- Nothing fades: opacity stays 1 throughout, so it is a pure wipe upward.

---

## 3. Header

- **Position:** `position: fixed`, 58px tall. It has a 1px bottom border (white at about 20 % over the hero,
  dark at about 15 % over cream). Logo text is on the left, and nav links sit on the right with a 40px gap.
- **Over the hero:** transparent background with white text.
- **Scrolled and showing:** switches to a solid `#F6F2EA` background with `#1A1A1A` text
  (a Framer variant swap, with no fade on the background).
- **Hide on scroll down:** `translateY(0 → -100px)` over ≈ **0.8s**, quart-out ease ≈ GSAP `power3.out` / `cubic-bezier(0.25, 1, 0.5, 1)`
  (52 % at 0.1s, 84 % at 0.25s).
- **Show on scroll up:** `translateY(-100px → 0)`, the same 0.8s with the same out-curve.
- **Hover on nav links:** a 1px underline at `bottom: 0`, full text width.

```css
.line { transform: scaleX(0); transform-origin: right;
        transition: transform .3s cubic-bezier(.4,0,.2,1); }
:hover > .line { transform: scaleX(1); transform-origin: left; }
```

On hover the line grows from the left. When the pointer leaves, it shrinks back toward the
right, because the origin flips.

## 4. Buttons and text reveal

- **Primary CTA style:** a text button, not a pill. Example: "View projects", Medium 500 at 16px,
  `letter-spacing: .01em`, `line-height: 1.3em`, `padding-bottom: 7px`, with a 1px underline
  `position:absolute; bottom:0; left:0; right:0`. Hover uses the same underline grow as the
  nav (0.3s, `cubic-bezier(.4,0,.2,1)`). At rest no underline shows. The colour does not change.
- **Hero h1 reveal:** the text is split into per-letter `inline-block` spans, grouped into
  `white-space:nowrap` word spans. All letters on a line move together, and line 2 starts about
  80ms after line 1.
  - Each letter: `y: 40px → 0`, `opacity: 0 → 1`, ≈ 0.45s, cubic-out (`power2.out`).
  - The reveal starts about 0.27s **before** the loader exit begins, so the heading is already settling
    as the curtain lifts.
- **Brand letters in the loader:** a separate split, per letter, staggered 0.05s, with blur (see §2).

---

## 5. Reusable values for Vastu Interior

Our rule that we animate only transform and opacity means two reference effects are rebuilt
differently:
- **Blur on the brand letters:** dropped. We use opacity and y only.
- **Animated border-radius on the curtain:** replaced by an ellipse element under the panel that scales
  on Y. It gives the same curved bottom edge with transform only.

```css
/* Loader shell */
.preloader { position: fixed; inset: 0; z-index: 100; pointer-events: none; }
.preloader__panel {
  position: absolute; inset: 0; padding: 12px;
  display: flex; flex-direction: column; justify-content: center; gap: 10px;
  background: var(--ink); color: var(--cream);
}
.preloader__curve {                   /* curved bottom edge, grows during exit */
  position: absolute; left: -10%; right: -10%; top: 100%;
  height: 14vw; border-radius: 0 0 50% 50%; background: inherit;
  transform: scaleY(0); transform-origin: top;
}
.preloader__brand { font: 500 20px/26px var(--font-sans); letter-spacing: .3px; }
.preloader__track { height: 4px; overflow: hidden; }
.preloader__line  { height: 100%; background: currentColor; transform: scaleX(0); transform-origin: left; }
.preloader__count { display: flex; justify-content: flex-end; align-items: baseline;
                    font: 400 200px/.8 var(--font-sans); letter-spacing: -.06em; }
.preloader__pct   { font-size: 48px; }
@media (max-width: 767px) { .preloader__brand { font-size: 18px; line-height: 23.4px; } }
```

```js
// GSAP timings (reference values; our loader keeps the shapes, shortens the totals)
tl.from('.preloader__brand .char', { y: 10, opacity: 0, duration: 0.9, ease: 'power1.out', stagger: 0.05 })
  .to('.preloader__line', { scaleX: 1, duration: 2.95, ease: 'power1.out' }, '>-0.05')
  .to(counter, { value: 100, duration: 2.5, ease: 'power3.out' }, '<')
  .add('exit', '+=0.1')
  .from('h1 .line', { y: 40, opacity: 0, duration: 0.45, ease: 'power2.out', stagger: 0.08 }, 'exit-=0.27')
  .to('.preloader__panel', { yPercent: -101, duration: 0.6, ease: 'power3.inOut' }, 'exit')
  .to('.preloader__curve', { scaleY: 1, duration: 0.6, ease: 'power3.inOut' }, 'exit');
// Header: hide { y: -100%, duration: 0.8, ease: 'power3.out' }, show { y: 0, same }
// Link underline: transition: transform .3s cubic-bezier(.4,0,.2,1), origin right → left on hover
```

**Our differences, by design:**
- **Real progress:** the counter follows actual asset loading (eager images, web fonts, window `load`).
  It never runs ahead of a time floor, so the loader always shows for at least about 2s.
- **Safety timeout:** the loader always closes by 5s.
- **Once per session:** it runs once per browser session (`sessionStorage`). It is skipped on repeat
  views and under `prefers-reduced-motion`.
- **Scroll lock:** the page cannot scroll while the loader shows. The reference does not lock it.
- **SEO:** the loader is an overlay only. All page content is in the HTML, and with JS off the loader
  is never shown.
