# KILENI Completion Design

## Goal

Bring the deployed KILENI site in line with the approved brand motion brief and make the public audit usable in production without regressing the working public routes, themes, or responsive layouts.

## Scope

### Brand and header

- Replace the current outlined scan-mark with a compact `KILENIseo` wordmark.
- Keep `KILENI` visually dominant and `seo` smaller and lighter; do not use a standalone icon, frame, chart, magnifier, scan line, or other SEO cliché.
- Use existing theme tokens: dark has a light wordmark, signal has a light wordmark with a restrained blue accent, and light has a dark wordmark.
- Add the public phone number and its existing phone icon to the desktop header. Keep it accessible from the mobile navigation.

### First-visit intro

- First visit lasts 4.0–4.5 seconds. Repeat visits use the existing short transition.
- Sequence: `KILENI` rests for 0.8–1.0 seconds; it separates into `KIL · E · NI`; `KIL` falls first and `NI` follows 120–180 ms later; `E` remains still for 350–450 ms; `S` glides in from the left; `O` rolls in from the right; the word becomes `SEO`; the two-line slogan appears; the scene settles into the hero.
- The motion uses only transform and opacity, is quiet and physically restrained, and has no glitch, RGB split, hacker styling, bounce, strong glow, autoplay audio, or WebGL.
- The full intro plays once per session, ends immediately and cleanly on user interaction, adapts to all three themes, and is skipped under `prefers-reduced-motion`.

### Cases and visual cleanup

- Use the main-screen analytics graphic as the visual reference for the two case graphs: a restrained blue line, thin grid, concise labels, and a quiet reveal.
- Animate the chart stroke, points, and numeric values from `35` to `93` and `37` to `80` when each case becomes active. Do not use perpetual or decorative animation.
- Remove text overflow and accidental decorative elements from the touched page families. Keep concise copy; do not add filler text.
- Retain the existing glossary, discount, contact icons, local editorial photos, and public route structure unless a concrete defect requires a change.

### Public audit and launch readiness

- Make public audit submission and progress work in the Vercel production deployment rather than only in the local E2E fixture.
- Keep error states explicit and stable; do not claim a completed audit when the worker cannot process it.
- Enable forms only after the required legal configuration is present. Do not expose unfinished legal forms to the public.

## Acceptance criteria

1. The header visibly contains the approved wordmark and phone contact at desktop and mobile widths.
2. A fresh session visibly follows the required intro stages within 4.0–4.5 seconds; repeat and reduced-motion paths remain short and accessible.
3. Dark, Signal, and Light render the changed logo, intro, header, cases, forms, and text legibly without horizontal overflow at 390, 768, 1024, and 1440 px.
4. Case charts and counters follow the main hero graph language and replay correctly when switching cases.
5. The public audit submits, reports progress, returns a result or an explicit operational error, and the production worker reports as available.
6. Build, typecheck, lint, unit/integration tests, Playwright tests, production smoke checks, console checks, and responsive browser checks pass.

## Deliberate limits

- The removed original recordings and screenshots cannot be recreated or used as pixel references.
- The audit must not be enabled with missing legal operator details; the final deployment will state any remaining configuration required from the owner.
