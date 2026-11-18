# Reference notes: interiia.framer.website

Captured 2026-11-18 with Playwright 1.49.1.
- **Browsers:** bundled Chromium 131 (headless) for most runs. Installed Google Chrome was used for the hero
  and layout runs, because the bundled build cannot play the hero's MP4.
- **Widths:** 1920, 1440, 1024 and 390 px.
- **What's in the repo:** the scripts and raw captures stay outside it. Nothing from the reference site
  (fonts, images, copy, code) is copied into this project. Only measurements are recorded here, and the
  site's own wording is described rather than quoted.

How it was measured:
- **Styles:** read with `getComputedStyle`.
- **Font files:** collected from network responses and `document.styleSheets`.
- **Animation timings:** sampled every animation frame by a `requestAnimationFrame` logger injected
  before page scripts.
- **Screenshots:** taken from a Chrome DevTools screencast, then cut to a fixed 100ms or 50ms grid.
- **Network conditions:** unthrottled, and throttled to 4 Mbps down with 150 ms latency and the cache disabled.

All times are in ms. Ease names use GSAP terms: `power1` = quad, `power2` = cubic,
`power3` = quart, `power4` = quint.

---

## 1. Typography

### Font files actually loaded

| File (framerusercontent.com/assets/…) | Family | Weight | Used for |
|---|---|---|---|
| `yUScEiZtXZCqdRimefTfBx1Q4.woff2` | PP Neue Montreal Book | 400 | h1, h2, loader counter, footer wordmark |
| `6uIfYl8bnz9kOy3KOuV7PxhFPhA.woff2` | PP Neue Montreal Medium | 500 | everything else |

The page CSS also declares `@font-face` rules that are never downloaded:
- PP Neue Montreal Bold (700), SemiBold Italic (600) and Italic (400).
- 36 Inter subset files, which are Framer defaults.

Every family has a metric-matched `"… Placeholder"` fallback on `local("Arial")` (size-adjust plus
ascent and descent overrides). All faces use `font-display: swap`. **No `text-transform` anywhere**:
there are no uppercase labels.

### Computed styles

The reference uses **three fixed breakpoints, not fluid sizes**:
- 1440 and 1920 give identical values.
- 1024 uses the tablet set.
- 390 uses the mobile set.

| Role | Weight | 1440 / 1920 | 1024 | 390 | Line-height | Letter-spacing |
|---|---|---|---|---|---|---|
| h1 (hero) | Book 400 | 60px | 48px | 40px | 1.1 | -0.1px |
| h2 (section) | Book 400 | 48px | 32px | 28px | 1.1 | 0.3px |
| Intro statement (large p, acts as h3) | Medium 500 | 32px | — | 22px | 1.3 | 0.3px |
| Card / list title | Medium 500 | 20px | — | 18px | 1.3 | 0.3px |
| Quote / large body (on image) | Medium 500 | 24px | — | — | 1.3 | 0.3px |
| Muted body (stat label) | Medium 500, `rgba(26,26,26,.7)` | 18px | — | 16px | 1.3 | 0.3px |
| Body | Medium 500 | 16px | — | 14px | 1.3 | 0.3px |
| Small label (section kicker) | Medium 500 | 14px | — | 12px | 1.44 | 0.5px |
| Nav link | Medium 500 | 14px | — | burger | 1.3em | 0.02em |
| Logo text in header | Medium 500 | 20px | — | 16px | 1.3 | 0.3px |
| Text button | Medium 500 | 16px | — | 14px | 1.3em | 0.01em |
| Footer wordmark | Book 400 | 60px text inside an SVG scaled to fit the width | | | 0.9 | normal |

There are no `h3` elements; sub-headings are styled `p` tags. Colours:
- Page background `#F6F2EA`, text `#1A1A1A`.
- Text on images `#FFFFFF`.
- Footer and dark cards `#262626`; loader `#1A1A1A`.

### Licensing and the font we use

**PP Neue Montreal** is a commercial typeface from Pangram Pangram Foundry. A paid licence is needed
for commercial web use, and it is **not** a Google Font, so **its files were not copied**.

The closest free Google Font is **Inter Tight** (SIL OFL 1.1). Both are neo-grotesques with
a single-storey `g`, straight terminals and low contrast. I compared 18 Google Font candidates with
canvas `measureText` at 100px, using the reference's own loaded fonts as the baseline:

| Font | Width error vs PP NM (avg of 5 strings) | x-height | Cap height |
|---|---|---|---|
| **Inter Tight 500 / 400** | **0.8 % / 1.8 %** | +7.8 % | +1.4 % |
| Hanken Grotesk 500 / 400 | 3.4 % / 7.1 % | -2 % | -2.8 % |
| Figtree 500 / 400 | 3.8 % / 7.2 % | -2 % | -2.8 % |
| Instrument Sans 500 / 400 | 6.9 % / 9.9 % | 0 % | 0 % |
| Manrope 400 (old body font) | 9.5 % | +5.9 % | 0 % |

**Why Inter Tight:**
- It keeps line lengths and wrapping almost exactly the same, with the same compact texture.
- Its taller x-height makes text read slightly larger at the same pixel size. That's acceptable, and it
  helps the 14px mobile body size.
- Hanken Grotesk matches x-height better, but sets 3–7 % wider and looks rounder.

**How it's set up in this project:**
- **Weights:** PP NM Book 400 maps to Inter Tight 400, and Medium 500 maps to Inter Tight 500.
- **Files:** `assets/fonts/inter-tight-latin-{400,500}.woff2`, from `@fontsource/inter-tight@5.1.1`. The licence is
  at `assets/fonts/OFL-inter-tight.txt`.
- **Fallback metrics against Arial:**

| | size-adjust | ascent-override | descent-override |
|---|---|---|---|
| Inter Tight 400 | 96.96 % | 99.91 % | 24.88 % |
| Inter Tight 500 | 99.24 % | 97.62 % | 24.31 % |

### Our fluid scale

This blends the reference's three steps into one linear curve from 390 to 1440 px:

```css
--fs-h1:    clamp(2.5rem,   2.0357rem + 1.9048vw, 3.75rem);  /* 40 → 60 (ref tablet 48) */
--fs-h2:    clamp(1.75rem,  1.2857rem + 1.9048vw, 3rem);     /* 28 → 48 (ref tablet 32) */
--fs-h3:    clamp(1.375rem, 1.1429rem + 0.9524vw, 2rem);     /* 22 → 32 */
--fs-h4:    clamp(1.125rem, 1.0786rem + 0.1905vw, 1.25rem);  /* 18 → 20 */
--fs-lg:    clamp(1rem,     0.9536rem + 0.1905vw, 1.125rem); /* 16 → 18 */
--fs-base:  clamp(0.875rem, 0.8286rem + 0.1905vw, 1rem);     /* 14 → 16 */
--fs-label: clamp(0.75rem,  0.7036rem + 0.1905vw, 0.875rem); /* 12 → 14 */
--lh-tight: 1.1; --lh-text: 1.3; --lh-label: 1.44;
--ls-h1: -0.1px; --ls-text: 0.3px; --ls-label: 0.5px; --ls-nav: 0.02em; --ls-btn: 0.01em;
```

---

## 2. Preloader

### DOM and layout (1440 × 900)

```
div  position:fixed; inset:0; z-index:10
└ div "container-wrap"     overflow:clip; height:100%
  ├ div "container-mask"   position:absolute; left:-10%; width:120%; height:100%;
  │                        background:#1A1A1A; z-index:4; overflow:clip      ← the curtain
  └ div "content-container" background:#1A1A1A; padding:12px; z-index:2;
      flex column, justify-content:center (vertically centred block)
      ├ brand row         left aligned, height 26           (390: 23.4)
      ├ gap 10px
      ├ progress track    full width, height 4px, overflow clip
      │   └ line          #F6F2EA, grows left → right
      ├ gap 10px
      └ counter row       justify-content:flex-end; height 160px
          └ number + "%"  align-items: baseline
```

- **Panel:** `#1A1A1A`, the full viewport, 12px padding on every side.
  - The block's top sits at y=345 at 1440×900 and at y=318 at 390×844, so it is vertically centred.
- **Brand name:** Medium 500 in `#F6F2EA`. It is 20px with 26px line-height at 1440 and 18px / 23.4px at 390,
  with 0.3px letter-spacing. Each letter is an `inline-block` span.
- **Progress line:** 4px tall and full content width (viewport − 24px), in `#F6F2EA`.
- **Counter:** right-aligned to the content edge, 12px from the viewport's right side.
  - Number: Book 400, `font-size: 200px` at every width, `line-height: .8em` (160px), `letter-spacing: -.06em`.
  - `%` sign: 48px with `letter-spacing: -.06em`, on the number's baseline.
  - "0%" is server-rendered, so it shows before any script runs.
- **Scroll:** not locked. html and body stay `overflow: visible`.

### Throttled load (4 Mbps / 150 ms), screenshots every 100 ms

There were two throttled runs.
- **Run A:** a blank white page for about 3.1s while the HTML arrives. Then the **page content flashes for
  about 200ms** (hero and stats row) before the loader paints at 3.34s. This is a flash of unstyled page
  before the overlay covers it.
- **Run B:** with the HTML from the CDN cache, the loader painted at 0.52s.
- **In both runs:** for the whole **first 4s after the loader paints, the frame is static**: dark panel and
  "0%" only. No brand letters show and the line doesn't move. The intro only starts once Framer's
  JavaScript has hydrated (at about 5.7s in a separate run), and the line then still takes 3.0s.

### Timeline (unthrottled, ms from navigation start)

| t | Event |
|---|---|
| 0–350 | Blank, then the panel with "0%" appears |
| ~1000 | **Brand letters in.** Each goes from `y: 10px → 0`, `opacity: 0 → 1` and `blur(~10px) → 0`. Stagger ≈ 0.05s per letter, each ≈ 0.9s, `power1.out` |
| ~1905 | **Progress starts**, right after the letters settle |
| 1905 → 4850 | **Line** goes `scaleX 0 → 1` over **2.95s**, `power1.out`. Fill was 31 % at 0.17, 57 % at 0.35, 77 % at 0.53, 91 % at 0.71 and 98 % at 0.89 of the duration |
| 1905 → ~4380 | **Counter** runs 0 → 100, slightly ahead of the line: about 2.5s, between `power2.out` and `power3.out` |
| exit − 630 | Hero heading starts revealing **underneath** the loader (see §3) |
| ~4740 | **Exit starts**, about 0.1s after the line completes |
| exit → +600 | Curtain lifts |

**The counter is a timed animation, not real loading progress.** It only waits for the JavaScript.

### Exit

- **What moves:** the panel and all its content move **up** together, `translateY 0 → −101 %`.
- **Curved edge:** the curtain is 120 % of the viewport wide, and its `border-radius` animates
  from 0 to 50 % during the lift.
  - This gives a convex bottom edge whose centre hangs lowest, about 100px below the sides at 1440 px.
- **Duration and easing:** **0.55–0.6s, `power3.inOut`**, about `cubic-bezier(0.76, 0, 0.24, 1)`.
  - Sampled travel: 1 % at 70ms, 13 % at 230ms, 28 % at 290ms, 46 % at 330ms, 68 % at 350ms,
    89 % at 410ms and 99 % at 530ms.
- **Opacity:** stays 1 the whole time, so it is a pure upward wipe.

---

## 3. Hero, and the reveal after the preloader

### Hero structure (1440 × 900)

- **Media:** a **video**, `<video autoplay muted loop playsinline>` with `object-fit: cover`.
  - It is `position:absolute; inset:0` inside a full-bleed container.
  - Its height is **100vh** at every width: 1080 at 1920, 900 at 1440, 768 at 1024 and 844 at 390.
  - It has no border-radius and runs **edge to edge**.
- **Overlay:** `background: rgb(25,25,25); opacity: .6`, on `inset:0` above the video.
- **Text layer:** `z-index: 2`.
  - **Heading:** top-left. Top padding is 150px at 1440 and 1024 and 130px at 390. Side padding is 60px at
    1440 and 1920, 32px at 1024 and 16px at 390. Heading box max-width is 500px (350px at 390).
  - **Paragraph and text button:** a right-aligned column, 400px wide, whose top sits 172px below the
    heading's top at 1440. The gap between paragraph and button is 16px. On mobile this column stacks
    under the heading.
  - **Stats row:** 4 items at the bottom, `justify-content: space-between`, each 200px wide (150px at 1024).
    It sits 40px above the bottom of the hero at 1440 and 1024, and 80px at 390. At 390 it becomes a 2×2 grid
    (`163px 163px`, gap `40px 32px`).
    - Each item has a small label at `opacity: .8` over a value line, with a 4px gap.

### What animates (sampled per frame, t = 0 when the curtain starts lifting)

| Element | Properties | From → to | Start | Duration / ease |
|---|---|---|---|---|
| h1, line 1 (letters move as one line) | `transform`, `opacity` | `translateY(40px)`, 0 → `none`, 1 | −630 | ≈ 0.45s to 97 %, settles by −100. Cubic-out (`power2.out`) |
| h1, line 2 | same | same | −565 (+65ms stagger) | same |
| Paragraph (word or line spans, all together) | `transform`, `opacity` | `translateY(25px)`, 0 → 0, 1 | −300 | ≈ 0.4s plus a spring-like tail that settles by about +500 |
| Text button wrapper | `transform`, `opacity` | `translateY(20px)`, 0 → 0, 1 | −70 | ≈ 0.47s, ends about +400 |
| Curtain (loader) | `transform` + curved edge | see §2 | 0 | 0.6s, `power3.inOut` |
| **Video, its wrapper, the overlay, the stats row** | **nothing** | — | — | Not animated: no clip-path, scale, size or radius change |

So **the heading animates before the media is revealed, not after it.** The text has finished arriving
under the curtain, and the lift itself is the reveal. In the 50ms screenshots the curtain clears the
viewport at about +600ms, and the hero is then fully composed. For the next 2s the only motion is the
video footage itself.

---

## 4. Layout

**Max-width:** none on sections. Everything is full width with fixed side gutters.

| Viewport | Side gutter (header, hero text, sections) | Header | Section top / bottom inner padding |
|---|---|---|---|
| 1920 | 60px | 58px tall, padding 16px 60px | 100 / 100 (full-bleed image section: 60 / 60) |
| 1440 | 60px | 58px, 16px 60px | 100 / 100 (60 / 60) |
| 1024 | 32px | 71px, 24px 32px | 60 / 60 (32 / 32) |
| 390 | 16px | 64px, 20px 16px | 40 / 40–60 (16 / 16) |

- **Spacing between sections:** sections sit flush, with 0px between them. All spacing is padding inside
  each section, as listed above.
- **Section heading:** each section heading (h2) is followed by a 1px full-width hairline about 24px below it
  (a visual estimate, not measured exactly). Content starts after that.

### Section by section (1440, then the other widths where they differ)

1. **Hero:** 100vh, edge to edge (see §3).
2. **Intro:**
   - Text column max 600px, starting at the gutter.
   - Stats row: 3 items of 173px with a 40px gap (`167px 167px` grid at 390).
   - Below it, an **edge-to-edge strip of portrait images**. Aspect ratio is 0.61 (about 3:5), heights step
     from 272 to 416px, the radius is 4px, and the strip runs off both edges. Its x positions are negative and
     change with scroll, so it is a scroll-linked horizontal drift; the motion was not measured.
   - The section is 1326px tall at 1440 and 1920.
3. **Services:**
   - Two columns: an image (`flex: 1`) plus a fixed 396px list, with a 40px gap (24px at 1024).
   - Image: 884×700 at 1440 (1.263), 1220×700 at 1920 (1.743), 648×600 at 1024 (1.08) and 358×215 at 390 (1.667).
     The height is fixed, so the ratio changes with width. No radius.
   - The list is an accordion with hairlines between items.
4. **Belief / quote:**
   - **Edge to edge**, 100vh, with a full-bleed image.
   - The h2 sits top-left at the inset (60px from the top). A second short h2 sits bottom-right.
   - The quote is in the middle, max-width 450–500px.
5. **Projects:**
   - Two columns: a 300px label column and a 1020px list (150 / 810 at 1024). Stacked at 390.
   - Each row is image + text with a 40px gap (24px at 1024), divided by hairlines.
   - Image ratio: 1.052 at 1440 (490×466), 1.167 at 1920, 0.857 at 1024 and 0.947 at 390. Radius 4px.
6. **Testimonials:**
   - A card (image plus text, 8px gap) in an 884px column, with controls in a 396px column and a 40px gap.
   - Image 434×488 at 1440. Avatar 48×48 with a 4px radius.
7. **FAQ:**
   - A contact card on the left (about 400px, tinted background, 4px radius) and an accordion on the right
     (about 50 %).
   - Rows are separated by hairlines, with a plus icon on the right.
8. **Footer** (`<footer>`, background `#262626`):
   - **Image band, edge to edge:** 467px tall at 1440 and 1920, 370px at 1024, 313px at 390.
   - **Overlay card** on the band: `#262626`, `padding: 32px` (24px at 390), `border-radius: 4px`, 500px wide
     (358px at 390). It sits 60px in from the left and top (16px at 390). It holds an h2, a paragraph and a
     small outlined button.
   - **Link area:** 3 equal columns, 387px each at 1440, with an 80px gap (32px at 1024). Each column has a small
     label over a hairline over its links. Stacked at 390.
   - **Wordmark:** text inside an SVG scaled to the full content width. It is 1360×445 at 1440, with 40px side
     inset, and 358×117 at 390. That makes the wordmark about 33 % as tall as it is wide.
   - **Bottom row:** social links on the left (24px gap) and the copyright on the right, with 32px bottom padding.

**Edge-to-edge sections:** hero video, intro image strip, belief image and footer image band.
Everything else sits inside the side gutter.

---

## 5. Header, buttons, heading reveals

- **Header:**
  - `position: fixed`, transparent over the hero, with white text.
  - It has a 1px bottom border, about 20 % white over the hero and about 15 % dark over cream.
  - Scrolled and showing: solid `#F6F2EA` with `#1A1A1A` text. This is a variant swap, so the background
    does not fade.
  - **Hide on scroll down:** `translateY(0 → −100px)` over 0.8s, quart-out (`power3.out` ≈
    `cubic-bezier(.25,1,.5,1)`). It was 52 % done at 0.1s and 84 % at 0.25s.
  - **Show on scroll up:** the reverse, with the same timing.
  - Nav: about 40px gap between links. The links are still shown at 1024 and become a burger at 390.
    The exact breakpoint wasn't measured.
- **Links and text buttons:** the primary call to action is a text link, not a pill. It has a 1px underline at
  `bottom: 0`, a 7px gap under the text, and no colour change on hover.

```css
.line { transform: scaleX(0); transform-origin: right;
        transition: transform .3s cubic-bezier(.4,0,.2,1); }
:hover > .line { transform: scaleX(1); transform-origin: left; }
```

  The line grows from the left on hover and shrinks back toward the right on leave.
  Secondary buttons, such as the footer card and FAQ card, are small outlined boxes with a 4px radius and a ↗ icon.
- **Heading reveals:**
  - The hero h1 is split into per-letter spans inside word spans, but each **line moves as one unit**.
    Each line goes `y: 40px → 0` with opacity 0 → 1 over about 0.45s with `power2.out`, staggered about 65ms between lines.
  - Section copy uses the same pattern with smaller offsets: 25px for paragraphs and 20px for buttons.

---

## 6. Reusable values

Our animation rule is transform and opacity only, so two effects are rebuilt differently:
- **Letter blur:** dropped.
- **Curtain radius animation:** replaced by an ellipse element (`.preloader__curve`) that scales on Y,
  giving the same curved edge.

```css
/* Layout */
--gutter: 60px;   /* ≥1200 */   /* 1024: 32px; 390: 16px */
--section-pad: 100px;            /* 1024: 60px; 390: 40px */
--hero-h: 100svh;
--hero-pad-top: 150px;           /* 390: 130px */
--hero-overlay: rgb(25 25 25 / .6);
--col-side: 396px;               /* fixed right column next to flexible media */
--col-gap: 40px;                 /* 1024: 24px */
--radius-media: 4px;
--hairline: 1px solid rgb(26 26 26 / .15);

/* Preloader */
.preloader { position: fixed; inset: 0; z-index: 100; overflow: hidden; }
.preloader__panel { position: absolute; inset: 0; padding: 12px; display: flex;
  flex-direction: column; justify-content: center; gap: 10px; background: var(--ink); color: var(--cream); }
.preloader__curve { position: absolute; left: -10%; right: -10%; top: 100%; height: 14vw;
  border-radius: 0 0 50% 50%; background: inherit; transform: scaleY(0); transform-origin: top; }
.preloader__brand { font: 500 20px/26px var(--font-sans); letter-spacing: .3px; }
.preloader__track { height: 4px; overflow: hidden; }
.preloader__line  { height: 100%; background: currentColor; transform: scaleX(0); transform-origin: left; }
.preloader__count { display: flex; justify-content: flex-end; align-items: baseline;
  font: 400 200px/.8 var(--font-sans); letter-spacing: -.06em; }
.preloader__pct   { font-size: .24em; letter-spacing: -.06em; }
```

```js
// GSAP equivalents of the reference timings (t=0 = curtain starts lifting)
const tl = gsap.timeline();
tl.from('.preloader__brand .char', { y: 10, opacity: 0, duration: 0.9, ease: 'power1.out', stagger: 0.05 })
  .to('.preloader__line', { scaleX: 1, duration: 2.95, ease: 'power1.out' })
  .to(counter, { value: 100, duration: 2.5, ease: 'power3.out' }, '<')
  .addLabel('exit', '+=0.1')
  .from('.hero h1 .line', { y: 40, opacity: 0, duration: 0.45, ease: 'power2.out', stagger: 0.065 }, 'exit-=0.63')
  .from('.hero .lead',    { y: 25, opacity: 0, duration: 0.6,  ease: 'power2.out' }, 'exit-=0.30')
  .from('.hero .btn-text',{ y: 20, opacity: 0, duration: 0.47, ease: 'power2.out' }, 'exit-=0.07')
  .to('.preloader__panel', { yPercent: -101, duration: 0.6, ease: 'power3.inOut' }, 'exit')
  .to('.preloader__curve', { scaleY: 1,      duration: 0.6, ease: 'power3.inOut' }, 'exit');
// Hero media: no animation (static video + 60 % overlay).
// Header: hide { yPercent: -100, duration: 0.8, ease: 'power3.out' }, show { yPercent: 0, same }
// Link underline: transform .3s cubic-bezier(.4,0,.2,1), origin right → left on hover
```

**Where our build intentionally differs:**
- **Real progress:** the counter follows real asset loading (eager images, web fonts, window `load`), with
  a 2s minimum.
- **Hard limits:** the loader always closes by 5s, measured from navigation start. It runs once per session
  and is skipped under reduced motion.
- **Scroll lock:** the page cannot scroll while the loader is visible. The reference does not lock it.
- **No content flash:** the overlay is styled in the first CSS paint, so the page never shows before the loader.
- **SEO:** the loader is an overlay only. All content is in the HTML, and without JS the loader never appears.
