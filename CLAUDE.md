# Vastu Interior Website
Static website for Vastu Interior, an interior design studio in Ahmedabad.

## Stack rules
- Plain HTML5, CSS3, vanilla JavaScript. No framework, no build step, no backend.
- Allowed libraries (self-hosted in assets/js/vendor/, pinned versions): GSAP, ScrollTrigger, Lenis.
- Clean folder URLs: /services/ = services/index.html. Internal links are root-relative.
- Header, footer and head partials are repeated in every HTML file, kept identical with scripts/sync-layout.js.

## Business details (single source of truth)
- Name: Vastu Interior
- Email: vastuinterior10@gmail.com
- Phone and WhatsApp: +91 63590 31530 (wa.me/916359031530)
- Address: Office 305, Silver Oak Arcade, SG Highway, Bodakdev, Ahmedabad, Gujarat 380054

## Design tokens (from logo and favicon)
--ink #171310, --espresso #2A1710, --brown #6B4C35, --gold #C9A36B, --cream #F5EFE6
Headings: Cormorant Garamond. Body: Manrope. Self-hosted woff2, font-display: swap.
8px spacing grid. Section padding 120px desktop / 72px mobile. Container max 1280px.
Style reference: architects.framer.website, interiia.framer.website, arkode.framer.website (editorial, big type, white space, smooth animation).

## Pages (29 total, no blog)
Main: home, about, services overview, projects, process, why-choose-us, testimonials, faq, contact, get-quote.
Services (8): residential-interior-design, commercial-interior-design, modular-interior-solutions, 3d-visualization-rendering, architectural-technical-drawings, turnkey-interior-execution, interior-estimation-project-management, space-planning-design-consultation.
Projects (6 sample): modern-3bhk-sg-highway, luxury-bungalow-bodakdev, corporate-office-ahmedabad, retail-showroom-ahmedabad, modular-kitchen-wardrobe, minimal-2bhk-home.
Utility: thank-you, privacy-policy, terms, 404, sitemap.html, plus sitemap.xml, robots.txt, site.webmanifest.

## Quality rules
- Every page: unique title (50-60 chars), meta description (140-160), canonical, OG and Twitter tags, lang="en-IN", one H1, JSON-LD, breadcrumbs (except home).
- Every image: WebP, width and height set, alt text, lazy-load except hero.
- Animate only transform and opacity. Respect prefers-reduced-motion.
- Mobile first. Test at 360, 768, 1024, 1440 px.
- No lorem ipsum. Write real copy about interior design in Ahmedabad.
- Never present sample projects or testimonials as real. Mark them clearly in code comments.
- Commit after each phase: "phase N: <name>".

## Folder structure
index.html, about.html, process.html, why-choose-us.html, testimonials.html, faq.html, contact.html, get-quote.html, thank-you.html, privacy-policy.html, terms.html, 404.html, sitemap.html, sitemap.xml, robots.txt, site.webmanifest
services/<slug>/index.html (+ services/index.html)
projects/<slug>/index.html (+ projects/index.html)
assets/css (base, layout, components, animations, pages), assets/js (main, animations, components, forms, vendor/), assets/fonts, assets/img (brand, hero, about, services/<slug>, projects/<slug>, icons), partials/, scripts/, docs/
