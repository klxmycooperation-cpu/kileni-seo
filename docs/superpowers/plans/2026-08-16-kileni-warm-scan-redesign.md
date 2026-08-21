# KILENI Warm Scan Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current blue SaaS-like public UI with the approved warm editorial design, add a real logo-first intro, lower and centralize prices, rewrite cases around verified facts, and repair local-production CSRF behavior.

**Architecture:** Keep all existing API contracts, routes, form components, audit worker and admin UI. Add isolated public-site styles and focused presentation components, while central content/config remains the source of truth. Intro behavior is a small client state machine backed by session storage and CSS/SVG motion.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS, Vitest, Playwright.

---

### Task 1: Repair local-production CSRF cookies

**Files:**
- Modify: `app/api/csrf/route.ts`
- Test: `tests/unit/csrf-route.test.ts`

- [ ] **Step 1: Write failing HTTP/HTTPS cookie tests**

Create requests for `http://localhost:3000/api/csrf` and `https://kileni.example/api/csrf`, then assert that only the HTTPS response contains the `Secure` cookie attribute.

```ts
expect(httpResponse.headers.get("set-cookie")).not.toContain("Secure");
expect(httpsResponse.headers.get("set-cookie")).toContain("Secure");
```

- [ ] **Step 2: Run the focused test and confirm the HTTP assertion fails**

Run: `pnpm exec vitest run tests/unit/csrf-route.test.ts`

- [ ] **Step 3: Derive the cookie flag from the effective request protocol**

```ts
const forwarded = request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim();
const secure = forwarded === "https" || request.nextUrl.protocol === "https:";
```

- [ ] **Step 4: Re-run the focused test**

Expected: both HTTP and HTTPS cases pass.

### Task 2: Build the logo-first brand intro and new hero

**Files:**
- Create: `src/components/home/BrandIntro.tsx`
- Modify: `src/components/home/HeroScan.tsx`
- Modify: `src/components/brand/Logo.tsx`
- Modify: `src/components/layout/SiteHeader.tsx`
- Create: `app/brand-intro.css`
- Test: `tests/e2e/public-pages.spec.ts`

- [ ] **Step 1: Add failing E2E assertions for first-session, repeat-session and reduced-motion behavior**

```ts
await expect(page.locator("[data-brand-intro='full']")).toBeVisible();
await page.reload();
await expect(page.locator("[data-brand-intro='full']")).toHaveCount(0);
```

- [ ] **Step 2: Implement the state machine**

Use `kileni:intro:v2`, an SSR-safe initial state, media query handling, an animation-end callback and a 2500 ms fallback. Dismiss on pointer, key, wheel or focus without consuming the user action.

- [ ] **Step 3: Implement inline SVG motion**

Animate the `K` mark with transforms and stroke offsets, reveal `KILENI SEO`, then remove the overlay. Keep the overlay `aria-hidden` and motion-only.

- [ ] **Step 4: Recompose the first screen**

Use a light editorial hero, a maximum three-line heading and a full-width integrated `AuditForm`. Remove fake data rows and the current right-side dark card composition.

- [ ] **Step 5: Run focused E2E checks**

Run: `pnpm exec playwright test tests/e2e/public-pages.spec.ts --grep "intro|reduced motion|home"`

### Task 3: Centralize and lower the price model

**Files:**
- Modify: `src/config/prices.ts`
- Modify: `src/config/price-labels.ts`
- Modify: `src/config/calculator.ts`
- Modify: `src/content/services.ts`
- Modify: `src/components/pages/PricingPage.tsx`
- Test: `tests/unit/calculator.test.ts`

- [ ] **Step 1: Change calculator expectations to the approved amounts**

Cover audit `6_900/19_900/29_900`, SEO `29_900/44_900/69_900`, marketplace entries, and development `49_900/99_900/179_900`.

- [ ] **Step 2: Run calculator tests and confirm old values fail**

Run: `pnpm exec vitest run tests/unit/calculator.test.ts`

- [ ] **Step 3: Update the single price configuration**

Remove the permanent first-audit discount shape. Store approved scope limits next to package content, not inside JSX.

- [ ] **Step 4: Make the calculator import `prices`**

No numeric package prices may remain duplicated in `calculator.ts`.

- [ ] **Step 5: Replace the pricing presentation**

Use simple rows with service, exact starting price and visible limit. Remove featured/recommended packages, strikethrough anchors and English decorative labels on RU pages.

- [ ] **Step 6: Re-run unit tests and search for old amounts**

Run: `pnpm exec vitest run tests/unit/calculator.test.ts && rg "125_000|100_000|79_900|60_000" src app`

### Task 4: Rebuild case presentation around verified facts

**Files:**
- Modify: `src/content/cases.ts`
- Modify: `src/components/pages/CasesPage.tsx`
- Modify: `src/components/home/HomePage.tsx`
- Create: `app/cases-pricing-redesign.css`

- [ ] **Step 1: Reshape case content for human-first evidence**

Add preview facts, initial problems, plain-language results, technical details and remaining work. Preserve only values confirmed in the audit DOCX files.

- [ ] **Step 2: Replace list cards with editorial case rows**

Lead with domain, period, task and concrete outcomes such as `509 из 509 страниц` and `CLS 0,519 → 0,0001`. Move internal scores to a secondary caption.

- [ ] **Step 3: Replace detail page headings**

Use: `С чем пришли`, `Что исправили`, `Результат повторной проверки`, `Что ещё требует внимания`.

- [ ] **Step 4: Check both locales and routes**

Run: `pnpm exec tsc --noEmit` and request `/cases/eco-santeh`, `/cases/zasorservice`, `/en/cases/eco-santeh` from the local server.

### Task 5: Apply the warm editorial system and rewrite public copy

**Files:**
- Create: `app/site-redesign.css`
- Modify: `app/layout.tsx`
- Modify: `src/components/layout/PublicShell.tsx`
- Modify: `src/components/layout/SiteFooter.tsx`
- Modify: `src/components/home/HomePage.tsx`
- Modify: `src/content/dictionary.ts`
- Modify: `src/content/services.ts`
- Modify: `src/components/pages/ServicePage.tsx`
- Modify: `src/components/pages/StaticPages.tsx`

- [ ] **Step 1: Add a scoped `.kileni-site` design layer**

Define the approved charcoal, paper, stone and signal-orange tokens. Keep audit-result and admin selectors unaffected.

- [ ] **Step 2: Recompose the home modules**

Use five task-and-price entries, a three-step working process, two editorial cases, concise service explanations and fewer repeated card grids.

- [ ] **Step 3: Rewrite AI-like public language**

Remove English decorative labels from RU pages, fake telemetry, defensive slogans and repeated `не X, а Y` constructions. Explain real technical terms on first use.

- [ ] **Step 4: Add responsive rules**

Explicitly cover 390, 768, 1024 and 1440 px, long Russian words, form stacking, navigation and case metrics.

- [ ] **Step 5: Run lint and typecheck**

Run: `pnpm lint && pnpm typecheck`.

### Task 6: Browser verification and production handoff

**Files:**
- Modify as required by discovered regressions only.
- Test: `tests/e2e/public-pages.spec.ts`

- [ ] **Step 1: Run unit and integration tests**

Run: `pnpm test`.

- [ ] **Step 2: Build production artifacts**

Run: `pnpm build`.

- [ ] **Step 3: Run production web and worker**

Use the existing local SQLite paths and start scripts. Do not deploy externally.

- [ ] **Step 4: Verify in Chromium and WebKit**

Check `/`, `/pricing`, `/cases`, both case pages, `/free-audit` and a form submission at desktop and mobile sizes. Confirm no console error, asset 404, horizontal overflow or CSRF rejection.

- [ ] **Step 5: Verify health**

Run: `curl --fail http://localhost:3000/api/health`.

- [ ] **Step 6: Update task tracking and report only verified outcomes**

No git commit is created because the workspace safety rules require separate user authorization for commits.
