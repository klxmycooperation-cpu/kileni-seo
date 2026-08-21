# KILENI Completion Implementation Plan

> **For agentic workers:** Execute this plan inline in the current task. The project rules prohibit delegated agents and Git commits.

**Goal:** Deliver the approved KILENI wordmark, header, intro, case visualisation, production-audit readiness, and visual QA without regressing public routes.

**Architecture:** Keep the site’s current Next.js component boundaries. The static logo remains in `Logo.tsx`; the timed full-screen motion remains in `BrandIntro.tsx` and `brand-intro.css`; case animation remains local to `HomeCaseExplorer.tsx` and `home-10.css`. Vercel audit continues to run the existing bounded inline audit path, with an explicit serverless health state and validated launch configuration.

**Tech Stack:** Next.js 16, React, TypeScript, CSS animations, Playwright, Vitest, Vercel serverless functions.

---

### Task 1: Lock the approved visual contract with failing browser tests

**Files:**
- Create: `tests/e2e/brand-completion.spec.ts`
- Modify: `tests/e2e/public-pages.spec.ts`

- [ ] **Step 1: Write the failing header and intro contract tests**

```ts
test("uses the approved wordmark and exposes the phone in both headers", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v3", "1"));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator(".brand-logo__wordmark")).toHaveText("KILENIseo");
  await expect(page.locator(".brand-logo svg")).toHaveCount(0);
  await expect(page.locator(".header-phone")).toHaveAttribute("href", /^tel:/u);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".menu-button").click();
  await expect(page.locator("#mobile-menu .header-phone")).toHaveAttribute("href", /^tel:/u);
});

test("plays the KIL E NI to SEO intro for 4.0–4.5 seconds", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.sessionStorage.removeItem("kileni:intro:v3"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".brand-intro__initial")).toHaveText("KILENI");
  await expect(page.locator(".brand-intro__split-e")).toHaveText("E");
  await expect(page.locator(".brand-intro__seo-letter--s")).toHaveText("S");
  await expect(page.locator(".brand-intro__seo-letter--o")).toHaveText("O");
  await expect(page.locator(".brand-intro__slogan")).toContainText("Разбираем по буквам");
  await expect(page.locator("html")).toHaveAttribute("data-kileni-intro", "done", { timeout: 4_700 });
});
```

- [ ] **Step 2: Run the new test and verify it fails because the current scan-logo and 3-second intro remain**

Run: `pnpm exec playwright test tests/e2e/brand-completion.spec.ts`

Expected: failing assertions for `.brand-logo__wordmark`, `.header-phone`, and the new intro-stage selectors.

### Task 2: Replace the scan mark and complete the responsive header

**Files:**
- Modify: `src/components/brand/Logo.tsx`
- Modify: `src/components/layout/SiteHeader.tsx`
- Modify: `app/brand-intro.css`
- Modify: `app/theme.css`

- [ ] **Step 1: Replace the SVG logo with semantic wordmark markup**

```tsx
<Link className={`brand-logo${inverted ? " brand-logo--inverted" : ""}`} href={localizedPath(locale)} aria-label={label}>
  <span className="brand-logo__wordmark" aria-hidden="true">
    <span className="brand-logo__primary">KILENI</span><span className="brand-logo__seo">seo</span>
  </span>
</Link>
```

The `aria-label` remains unchanged. Delete the old `brand-logo__scan`, dot, and SVG-specific rules rather than hiding them.

- [ ] **Step 2: Add a phone link derived from `siteConfig.publicContacts.phone`**

```tsx
const phoneHref = `tel:${siteConfig.publicContacts.phone.replace(/[^+\d]/gu, "")}`;
const phoneLink = <a className="header-phone" href={phoneHref} aria-label={locale === "ru" ? `Позвонить ${siteConfig.publicContacts.phone}` : `Call ${siteConfig.publicContacts.phone}`}>
  <img src="/contact-icons/phone.svg" alt="" aria-hidden="true" />
  <span>{siteConfig.publicContacts.phone}</span>
</a>;
```

Render `phoneLink` in the desktop actions and the existing `#mobile-menu` navigation. Preserve the menu’s keyboard behaviour.

- [ ] **Step 3: Style the wordmark and phone only through theme variables**

```css
.brand-logo__wordmark { display:inline-flex; align-items:baseline; color:var(--kileni-logo-ink); font-family:var(--font-manrope),sans-serif; letter-spacing:-.065em; line-height:1; }
.brand-logo__primary { font-size:1.12rem; font-weight:760; }
.brand-logo__seo { margin-left:.1em; color:var(--kileni-logo-accent); font-size:.72rem; font-weight:560; letter-spacing:-.03em; }
.header-phone { display:inline-flex; min-width:0; align-items:center; gap:.45rem; color:var(--kileni-logo-ink); font:650 .72rem var(--font-manrope),sans-serif; }
.header-phone img { width:1rem; height:1rem; }
```

Define `--kileni-logo-ink` and `--kileni-logo-accent` for light, dark, and signal; hide the desktop phone before it compromises navigation, while retaining the mobile link.

- [ ] **Step 4: Run the header test and the existing navigation suite**

Run: `pnpm exec playwright test tests/e2e/brand-completion.spec.ts tests/e2e/public-pages.spec.ts`

Expected: PASS.

### Task 3: Implement the approved first-visit intro

**Files:**
- Modify: `src/components/home/brand-intro-config.ts`
- Modify: `src/components/home/BrandIntro.tsx`
- Modify: `app/brand-intro.css`
- Modify: `tests/e2e/brand-completion.spec.ts`
- Modify: `tests/e2e/public-pages.spec.ts`

- [ ] **Step 1: Change the first-visit duration to 4.4 seconds and retain the 320 ms repeat path**

```ts
export const INTRO_DURATION_MS = 4_400;
export const REPEAT_DURATION_MS = 320;
```

Keep the existing early-exit, session key, hydration bootstrap, and reduced-motion branches.

- [ ] **Step 2: Replace the old lines, points, and SVG draw sequence with stage-specific text markup**

```tsx
<div className="brand-intro" aria-hidden="true">
  <div className="brand-intro__sequence">
    <span className="brand-intro__initial">KILENI</span>
    <span className="brand-intro__split"><span className="brand-intro__split-kil">KIL</span><span className="brand-intro__split-e">E</span><span className="brand-intro__split-ni">NI</span></span>
    <span className="brand-intro__seo"><span className="brand-intro__seo-letter--s">S</span><span>E</span><span className="brand-intro__seo-letter--o">O</span></span>
    <span className="brand-intro__slogan"><span>Разбираем по буквам.</span><strong>Продвигаем по делу.</strong></span>
  </div>
</div>
```

- [ ] **Step 3: Build the timeline with transform and opacity only**

Use CSS keyframes with these explicit stages: initial 0–1000 ms; split 1000–1180 ms; KIL fall 1180–1800 ms; NI fall 1340–1960 ms; E hold through 2400 ms; S 2400–2900 ms; O 2500–3100 ms; word settle through 3300 ms; slogan lines 3400 ms and 3600 ms; hero dissolve 4000–4400 ms. `O` may rotate once while translating; no other rotation, bounce, glow, or decorative field is allowed.

- [ ] **Step 4: Add the three theme variables and reduced-motion static state**

All theme variants use the same geometry. Under reduced motion, render no overlay and leave the hero immediately visible.

- [ ] **Step 5: Replace the old 3000 ms assertions with the stage and duration tests**

Run: `pnpm exec playwright test tests/e2e/brand-completion.spec.ts tests/e2e/public-pages.spec.ts`

Expected: PASS; the natural visual duration is between 4000 and 4500 ms, the repeat path remains at or below 350 ms, and keyboard/pointer dismissal remains immediate.

### Task 4: Bring case charts and metrics into the hero analytics language

**Files:**
- Modify: `src/components/home/HomeCaseExplorer.tsx`
- Modify: `app/home-10.css`
- Create: `tests/e2e/case-analytics-motion.spec.ts`

- [ ] **Step 1: Write the failing case animation test**

```ts
test("replays the restrained analytics chart and numeric result for each case", async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem("kileni:intro:v3", "1"));
  await page.goto("/#home-cases");
  const chart = page.locator(".home-case-explorer__chart");
  await expect(chart).toHaveAttribute("data-ready", "true");
  await expect(page.locator("[data-case='eco-santeh'] .home-case-explorer__metric-value").first()).toHaveAttribute("data-target", "93");
  await page.getByRole("tab", { name: /засорсервис/u }).click();
  await expect(page.locator("[data-case='zasorservice'] .home-case-explorer__chart")).toHaveAttribute("data-ready", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
```

- [ ] **Step 2: Run the test and verify it fails because charts and metric values are static**

Run: `pnpm exec playwright test tests/e2e/case-analytics-motion.spec.ts`

Expected: FAIL for the missing `data-ready` and `data-target` contracts.

- [ ] **Step 3: Add local replay state and a reduced-motion-safe metric formatter**

Use the active case index as a React key, trigger `data-ready="true"` after mount, and animate only parseable numeric metric strings. A metric such as `509/509` stays textual; values with one numeric target use `requestAnimationFrame` from zero to target. Under reduced motion, render the final string immediately.

- [ ] **Step 4: Animate chart stroke and points in CSS**

```css
.home-case-explorer__chart[data-ready="true"] .home-case-explorer__chart-line { animation:kileni-case-line 900ms cubic-bezier(.22,1,.36,1) forwards; }
.home-case-explorer__chart[data-ready="true"] circle { animation:kileni-case-point 260ms var(--point-delay) ease-out both; }
@keyframes kileni-case-line { from { stroke-dashoffset:900; } to { stroke-dashoffset:0; } }
```

Keep the panel, grid, line weight, and blue accent aligned with `HeroAuditTool`; do not add gradients, a permanently moving line, or oversized labels.

- [ ] **Step 5: Run focused tests**

Run: `pnpm exec playwright test tests/e2e/case-analytics-motion.spec.ts tests/e2e/cases-brief-refinement.spec.ts tests/e2e/analytics-visuals.spec.ts`

Expected: PASS.

### Task 5: Add evidence-backed visual QA across themes and routes

**Files:**
- Create: `tests/e2e/visual-qa.spec.ts`
- Modify: `app/theme.css` only for failures reproduced by the new test
- Modify: `app/home-10.css` only for failures reproduced by the new test
- Modify: `src/components/pages/PricingPage.tsx` only if the audit identifies duplicated or misleading filler copy

- [ ] **Step 1: Add an overflow test across the public page families and three themes**

```ts
for (const theme of ["light", "dark", "signal"] as const) {
  for (const path of ["/", "/pricing", "/cases", "/seo-audit", "/custom-task", "/blog", "/about", "/glossary"]) {
    test(`${theme} ${path} has no horizontal overflow at mobile width`, async ({ page }) => {
      await page.addInitScript((value) => {
        window.sessionStorage.setItem("kileni:intro:v3", "1");
        window.localStorage.setItem("kileni:theme:v1", value);
      }, theme);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    });
  }
}
```

- [ ] **Step 2: Add targeted assertions for visible audit limit, glossary, discount, pricing copy, contact icons, and home section headings**

Test observable behaviour, not internal class names. Keep the existing phrase “Цена и предел — рядом” only if it remains a clear label after visual review; otherwise replace it with concise, concrete scope copy and update the associated test.

- [ ] **Step 3: Run the test, fix only reproduced visual defects, and rerun it**

Run: `pnpm exec playwright test tests/e2e/visual-qa.spec.ts`

Expected: initial baseline; after focused fixes, PASS in all 24 route/theme cases.

### Task 6: Make Vercel audit status honest and complete the production launch gate

**Files:**
- Modify: `app/api/health/route.ts`
- Modify: `tests/integration/audit-vercel-stream.test.ts`
- Modify: `tests/unit/validate-launch.test.ts`
- Modify: `docs/superpowers/specs/2026-08-21-kileni-completion-design.md`

- [ ] **Step 1: Write a failing health test for Vercel inline-audit mode**

```ts
it("reports inline audit execution instead of a missing worker on Vercel", async () => {
  vi.stubEnv("VERCEL", "1");
  const response = GET();
  expect(await response.json()).toMatchObject({ status: "ok", database: "ok", worker: "inline" });
});
```

- [ ] **Step 2: Implement Vercel-aware health reporting**

```ts
if (process.env.VERCEL === "1") {
  return noStoreJson({ status: "ok", database: "ephemeral", worker: "inline", checkedAt: new Date().toISOString() });
}
```

Keep the existing worker heartbeat status for local and container deployments.

- [ ] **Step 3: Verify the serverless stream behaviour with a signed restore envelope**

Run: `pnpm test:integration -- tests/integration/audit-vercel-stream.test.ts tests/integration/audit-public-token-authority.test.ts && pnpm test -- tests/unit/validate-launch.test.ts`

Expected: PASS. The Vercel route produces explicit progress, a public-only signed result, and no result when `AUDIT_RESTORE_SECRET` is absent.

- [ ] **Step 4: Prepare, but do not invent, the production configuration**

Before enabling forms, obtain these values from the owner: `LEGAL_NAME`, `LEGAL_ADDRESS`, `LEGAL_EMAIL`, `LEGAL_INN`, `LEGAL_POLICY_URL`, `LEGAL_CONSENT_URL`. Generate and set a 32+ byte `AUDIT_RESTORE_SECRET` only with explicit approval. Then set `FORMS_ENABLED=true` and `PRELAUNCH_MODE=false` for production.

### Task 7: Final verification and controlled Vercel release

**Files:**
- No production code changes unless a test exposes a defect.

- [ ] **Step 1: Run the full local quality gate**

Run: `pnpm test:unit && pnpm test:integration && pnpm test:e2e && pnpm typecheck && pnpm lint && pnpm build`

Expected: all commands pass; the build emits no launch configuration warning with the final approved production environment.

- [ ] **Step 2: Browser-check desktop, tablet, and mobile**

Check 390, 768, 1024, and 1440 px in Light, Dark, and Signal. Verify the fresh intro, repeat intro, reduced-motion path, header phone, menus, case switch/chart/counters, pricing, free-audit progress, result/error, console, and network responses.

- [ ] **Step 3: Deploy the exact verified state to the existing `kileni-seo` Vercel project**

Before deployment, report the exact source changes, production environment changes, possible effect (forms become public and search indexing may become enabled), and rollback method (redeploy the previous Vercel deployment). Then deploy with Vercel production aliases.

- [ ] **Step 4: Production smoke test**

Check `/`, `/api/health`, one valid audit submission using non-sensitive test contact data only after approval, live progress, the public result URL, and the mobile header. Confirm `200` page response, `worker: inline`, enabled form submission, and no console errors.
