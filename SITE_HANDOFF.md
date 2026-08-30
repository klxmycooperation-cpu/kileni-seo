# SITE HANDOFF — KILENI

> Снимок подготовлен 2026-08-27 для безопасной передачи исходников в SEO Machine. Production при подготовке не изменялся, сервисы не останавливались, deployment не выполнялся.

## Идентификация

- Публичный URL: `https://kileni-seo.ru`
- Настоящий исходный Git-репозиторий: `/Users/klmxy/Documents/zing-PROJECT`
- Git branch: `fix/kileni-release-ready`
- Commit SHA: `628cfc1c2b3d43fc57da22bc6dbb11b8131ef832`
- Git remote URL: не настроен (`git remote` не возвращает ни одного remote).
- Важно: рабочее дерево содержит значительный объём незакоммиченных изменений. Текущий production был собран из выбранной части этого рабочего дерева, поэтому один SHA не воспроизводит опубликованную версию. Передаваемый ZIP содержит безопасную копию актуальных исходников рабочего дерева по белому списку.

## Git status --short

Снимок ниже зафиксирован после добавления этого файла. Untracked-каталоги показаны Git в сокращённом виде; они не включаются в ZIP автоматически.

```text
 M .dockerignore
 M Dockerfile
 M RELEASE_CHECKLIST.md
 M app/[...slug]/page.tsx
 M app/about/page.tsx
 M app/admin/_lib/data.ts
 M app/admin/admin.css
 M app/admin/audits/[id]/page.tsx
 M app/admin/audits/page.tsx
 M app/admin/briefs/[id]/page.tsx
 M app/admin/briefs/page.tsx
 M app/admin/leads/[id]/page.tsx
 M app/admin/leads/page.tsx
 M app/api/_lib/audit-public.ts
 M app/api/_lib/submission.ts
 M app/api/admin/_lib/entities.ts
 M app/api/admin/attachments/[id]/route.ts
 M app/api/admin/audits/[id]/export/route.ts
 M app/api/admin/audits/[id]/route.ts
 M app/api/admin/briefs/[id]/route.ts
 M app/api/admin/session/route.ts
 M app/api/audit/health/route.ts
 M app/api/audits/[token]/events/route.ts
 M app/api/audits/[token]/report.pdf/route.ts
 M app/api/audits/[token]/route.ts
 M app/api/audits/route.ts
 M app/api/briefs/route.ts
 M app/api/calculator/route.ts
 M app/api/health/route.ts
 M app/api/leads/route.ts
 M app/api/public-metrics/free-audits/route.ts
 M app/architecture-10.css
 M app/audit-progress-refinement.css
 M app/brand-intro.css
 M app/consent/page.tsx
 M app/contacts/page.tsx
 M app/editorial.css
 M app/en/[...slug]/page.tsx
 M app/en/page.tsx
 M app/error.tsx
 M app/home-10.css
 M app/kileni-10.css
 M app/layout.tsx
 M app/not-found.tsx
 M app/page.tsx
 M app/privacy/page.tsx
 M app/robots.ts
 M app/service-pricing-brief-10.css
 M app/sitemap.ts
 M app/theme.css
 M docker-compose.yml
 M docs/audit-scoring.md
 M docs/redesign-screenshots/after/about-desktop.png
 M docs/redesign-screenshots/after/article-desktop.png
 M docs/redesign-screenshots/after/brief-desktop.png
 M docs/redesign-screenshots/after/brief-mobile.png
 M docs/redesign-screenshots/after/case-eco-santeh.png
 M docs/redesign-screenshots/after/case-zasorservice.png
 M docs/redesign-screenshots/after/cases-desktop.png
 M docs/redesign-screenshots/after/free-audit.png
 M docs/redesign-screenshots/after/hero-desktop.png
 M docs/redesign-screenshots/after/home-desktop.png
 M docs/redesign-screenshots/after/home-en.png
 M docs/redesign-screenshots/after/home-mobile.png
 M docs/redesign-screenshots/after/menu-desktop.png
 M docs/redesign-screenshots/after/pricing-desktop.png
 M docs/redesign-screenshots/after/visual-qa.json
 M next.config.ts
 M package.json
 M playwright.config.ts
 M pnpm-lock.yaml
 M public/brand/kileni-og.png
 M public/brand/kileni-og.svg
 M public/contact-icons/phone.svg
 M public/downloads/generated/en-audit-brief.docx
 M public/downloads/generated/en-audit-brief.pdf
 M public/downloads/generated/en-development-brief.docx
 M public/downloads/generated/en-development-brief.pdf
 M public/downloads/generated/en-marketplaces-brief.docx
 M public/downloads/generated/en-marketplaces-brief.pdf
 M public/downloads/generated/en-seo-brief.docx
 M public/downloads/generated/en-seo-brief.pdf
 M public/downloads/generated/ru-audit-brief.docx
 M public/downloads/generated/ru-audit-brief.pdf
 M public/downloads/generated/ru-development-brief.docx
 M public/downloads/generated/ru-development-brief.pdf
 M public/downloads/generated/ru-marketplaces-brief.docx
 M public/downloads/generated/ru-marketplaces-brief.pdf
 M public/downloads/generated/ru-seo-brief.docx
 M public/downloads/generated/ru-seo-brief.pdf
 M scripts/db-check.ts
 M scripts/generate-briefs.mjs
 M scripts/migrate.ts
 M scripts/start.mjs
 M scripts/validate-launch.mjs
 M scripts/visual-qa.mjs
 M src/components/analytics/AnalyticsVisuals.tsx
 M src/components/brand/Logo.tsx
 M src/components/contact/PublicContactLinks.tsx
 M src/components/forms/AuditForm.tsx
 M src/components/forms/BriefWizard.tsx
 M src/components/forms/Calculator.tsx
 M src/components/forms/FreeAuditUsageCounter.tsx
 M src/components/forms/LeadForm.tsx
 M src/components/forms/TurnstileField.tsx
 M src/components/forms/useCsrf.ts
 M src/components/home/BrandIntro.tsx
 M src/components/home/HeroFreeAuditUsageCounter.tsx
 M src/components/home/HeroScan.tsx
 M src/components/home/HomeCaseExplorer.tsx
 M src/components/home/HomeDecisionRoute.tsx
 M src/components/home/HomePage.tsx
 M src/components/home/HomeProcessSteps.tsx
 M src/components/home/brand-intro-config.ts
 M src/components/layout/Breadcrumbs.tsx
 M src/components/layout/CookieManager.tsx
 M src/components/layout/PublicShell.tsx
 M src/components/layout/SiteFooter.tsx
 M src/components/layout/SiteHeader.tsx
 M src/components/layout/ThemeToggle.tsx
 M src/components/pages/ArticlesPage.tsx
 M src/components/pages/AuditProgressPage.tsx
 M src/components/pages/CasesPage.tsx
 M src/components/pages/FreeAuditPage.tsx
 M src/components/pages/GlossaryPage.tsx
 M src/components/pages/InlineGlossaryTerms.tsx
 M src/components/pages/MarketplaceOfferSelector.tsx
 M src/components/pages/MarketplacePage.tsx
 M src/components/pages/PricingCategorySelector.tsx
 M src/components/pages/PricingPage.tsx
 M src/components/pages/PublicRoute.tsx
 M src/components/pages/ServicePage.tsx
 M src/components/pages/ServiceTierSelection.tsx
 M src/components/pages/ServiceVisual.tsx
 M src/components/pages/StaticPages.tsx
 M src/config/calculator.ts
 M src/config/price-labels.ts
 M src/config/prices.ts
 M src/config/public-audit.ts
 M src/config/site.ts
 M src/content/articles-expansion.ts
 M src/content/articles.ts
 M src/content/brief.ts
 M src/content/dictionary.ts
 M src/content/glossary.ts
 M src/content/marketplaces.ts
 M src/content/services.ts
 M src/db/client.ts
 M src/db/migrations.ts
 M src/db/public-metrics.ts
 M src/db/queries.ts
 M src/db/submissions.ts
 M src/lib/attribution.ts
 M src/lib/audit/crawler.ts
 M src/lib/audit/engine.ts
 M src/lib/audit/index.ts
 M src/lib/audit/lead-handoff.ts
 M src/lib/audit/scoring.ts
 M src/lib/audit/types.ts
 M src/lib/notifications/telegram.ts
 M src/lib/public-contacts.ts
 M src/lib/reports/audit-pdf.ts
 M src/lib/security/inputs.ts
 M src/lib/security/rate-limit.ts
 M src/lib/security/turnstile.ts
 M tests/e2e/analytics-visuals.spec.ts
 M tests/e2e/articles-10.spec.ts
 M tests/e2e/audit-fixture.ts
 M tests/e2e/audit-progress-themes.spec.ts
 M tests/e2e/brand-completion.spec.ts
 M tests/e2e/cases-brief-refinement.spec.ts
 M tests/e2e/cookie-manager-10.spec.ts
 M tests/e2e/free-audit-social-proof.spec.ts
 M tests/e2e/home-10.spec.ts
 M tests/e2e/internal-themes.spec.ts
 M tests/e2e/marketplace-commerce.spec.ts
 M tests/e2e/public-contacts.spec.ts
 M tests/e2e/public-pages.spec.ts
 M tests/e2e/refinement.spec.ts
 M tests/integration/audit-public-token-authority.test.ts
 M tests/integration/audit-vercel-stream.test.ts
 M tests/integration/free-audit-usage.test.ts
 M tests/integration/sqlite-security.test.ts
 M tests/unit/articles-editorial.test.ts
 M tests/unit/audit-engine.test.ts
 M tests/unit/audit-health-route.test.ts
 M tests/unit/audit-lead-handoff.test.ts
 M tests/unit/audit-scoring.test.ts
 M tests/unit/calculator.test.ts
 M tests/unit/contact-inputs.test.ts
 M tests/unit/forms-enabled-gate.test.ts
 M tests/unit/free-audit-metric-route.test.ts
 M tests/unit/health-route.test.ts
 M tests/unit/legal-config.test.ts
 M tests/unit/prices.test.ts
 M tests/unit/public-contacts.test.ts
 M tests/unit/site-config-audit.test.ts
 M tests/unit/turnstile.test.ts
 M tests/unit/validate-launch.test.ts
 M worker/index.ts
?? .openai/
?? .serena/
?? .superpowers/
?? Invoke-Task6SqlSetup-v6.ps1
?? New-Task6PreSetupV6.ps1
?? New-Task6ValidateOnlySealV6.ps1
?? SITE_HANDOFF.md
?? app/admin/_lib/audit-view.ts
?? app/admin/audits/_components/
?? app/brand-intro-v9.css
?? app/compact-redesign.css
?? current-desktop-audit-2.png
?? current-desktop-audit.png
?? current-desktop-chz.png
?? deployment/
?? docs/redesign-screenshots/after/blog-desktop.png
?? docs/redesign-screenshots/after/matrix/
?? docs/research/
?? docs/superpowers/plans/2026-08-23-kileni-brand-intro-video.md
?? docs/superpowers/specs/2026-08-23-kileni-brand-intro-motion-design.md
?? meeting-analysis-2026-08-03/
?? meeting-analysis-2026-08-04-IMG_0405/
?? meeting-analysis-2026-08-15-Fg-Pakeyging-ZAO-5/
?? output/
?? public/brand/kileni-intro-foley-v9.m4a
?? public/brand/kileni-logo-current.svg
?? public/editorial/indexing-path-v2.png
?? public/editorial/marketplace-card-production-v2.png
?? public/editorial/seo-audit-workflow-v2.png
?? public/editorial/seo-ecommerce-promotion-v2.png
?? public/editorial/seo-promotion-cost-v2.png
?? public/editorial/seo-vs-yandex-ads-v2.png
?? public/editorial/website-speed-loading-v2.png
?? public/marketplaces/SOURCES.md
?? public/marketplaces/megamarket.svg
?? public/marketplaces/ozon.svg
?? public/marketplaces/wildberries.svg
?? public/marketplaces/yandex-market.svg
?? rad-studio-handoff.png
?? runtime-gui-audit-final.png
?? runtime-gui-audit.png
?? runtime-xmlupd-smoke-2026-08-04.png
?? src/components/forms/ConsentNotice.tsx
?? src/components/home/HomeArticleCarousel.tsx
?? src/components/pages/AuditChecksPage.tsx
?? src/components/pages/AuditResultReport.tsx
?? src/components/pages/GlossaryTermPage.tsx
?? src/config/legal-defaults.json
?? src/config/seo-metadata.ts
?? src/content/audit-checks.ts
?? src/lib/audit/version.ts
?? src/lib/seo/
?? test-results-final-mobile/
?? test-results-final-targeted/
?? test-results-form-focus-debug/
?? test-results-form-focus-layout/
?? test-results-form-focus-mousedown/
?? test-results-form-invalid-effect/
?? test-results-form-invalid-focus/
?? test-results-form-invalid/
?? test-results-form-url/
?? test-results/
?? tests/unit/admin-audit-view.test.ts
?? tests/unit/attribution.test.ts
?? tests/unit/audit-checks-content.test.ts
?? tests/unit/audit-consent-notice.test.ts
?? tests/unit/audit-public-result.test.ts
?? tests/unit/glossary-details.test.ts
?? tests/unit/public-audit-config.test.ts
?? tests/unit/public-navigation-seo.test.ts
?? tests/unit/public-seo-metadata.test.ts
?? tmp/
?? xmlupd-smoke-debug.png
?? xmlupd-smoke-failed.png
?? xmlupd-smoke-final.png
?? "\320\236\321\202\321\207\320\265\321\202_\320\277\321\200\320\276\320\262\320\265\321\200\320\272\320\260_\320\247\320\227_2026-08-03.docx"
```

## Стек и архитектура

- Framework: Next.js App Router `16.3.1` (package constraint `^16.2.12`).
- UI runtime: React / ReactDOM `19.2.6`.
- Язык и компилятор: TypeScript `5.9.3`.
- Runtime production image: Node.js `22.14.0`; проект требует Node.js `>=22.13.0`.
- Менеджер зависимостей: pnpm `10.33.0`; канонический lock-файл — `pnpm-lock.yaml`.
- CMS: отсутствует. Контент хранится в TypeScript-файлах `src/content/`.
- Данные: SQLite в WAL-режиме и Drizzle; схема и миграции без данных находятся в `src/db/schema.ts` и `src/db/migrations.ts`.
- Фоновые задачи: отдельный Node.js worker для SEO-аудитов.

Устаревший `package-lock.json` относится к другому Vite/Vinext-контуру и не является источником зависимостей этого сайта. В безопасный ZIP он не включён.

В `app/` и `src/` также остаются tracked legacy-маршруты и компоненты каталога ароматов. Они включены в ZIP вместе с требуемыми статическими assets, потому что участвуют в текущей Next.js-сборке; SEO Machine следует отдельно определить, должны ли эти публичные маршруты оставаться индексируемыми. Старый Vite build-plugin и его lock-файл в текущем Next/pnpm-контуре не используются и в пакет не включены.

## Установка и локальный запуск

```bash
corepack enable
corepack prepare pnpm@10.33.0 --activate
pnpm install --frozen-lockfile
cp .env.example .env
pnpm db:migrate
pnpm dev
```

Локальный web по умолчанию: `http://localhost:3000`. Команда `pnpm dev` запускает web и worker вместе.

Раздельный запуск:

```bash
pnpm dev:web
pnpm worker
```

## Проверки и сборка

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm build
```

Запуск уже собранных процессов:

```bash
pnpm start
pnpm worker:start
```

## Текущий production deployment

- Площадка: один Linux-host в Timeweb Cloud.
- Способ запуска: Docker Engine + Docker Compose v2.
- Сервисы приложения: `web` (Next.js standalone/Node.js) и `worker` (Node.js).
- Данные и приватные вложения: общий persistent volume `kileni_data`; они не входят в пакет.
- Публичный HTTPS: внешний Caddy reverse proxy; приложение не является IIS, CMS, статическим hosting или обычным web-root.
- Текущий checkout на сервере: `/opt/kileni-seo`.
- Compose project: `kileni-seo`.
- Обновление сейчас выполняется вручную: выборочная синхронизация исходников, сборка image `web` и `worker`, затем пересоздание только этих двух сервисов с `--no-deps`; общий Caddy не пересоздаётся.
- В репозитории есть базовый `docker-compose.yml` и безопасный project-specific `deployment/Caddyfile.standalone`. Используемый на сервере overlay `deployment/standalone.compose.yml` в Git-репозитории отсутствует — это пробел воспроизводимости, который нужно закрыть до следующего независимого deployment.

Документированный общий сценарий обновления:

```bash
docker compose exec web node /app/scripts/backup.mjs
docker compose build --pull
docker compose up -d
docker compose ps
```

Эти команды приведены для handoff и при подготовке пакета не запускались.

## Staging

Отдельный staging-домен, staging Compose-конфигурация и CI workflow в исходниках отсутствуют. Локальная папка `.vercel` указывает на исторически связанный Vercel-проект, но активный preview/staging сейчас не подтверждён и `.vercel` в ZIP не включается.

## Возврат предыдущего релиза

Автоматического rollback pipeline в репозитории нет. Для последнего выпуска были сохранены:

- Docker image `kileni-web:rollback-20260826T174754Z`;
- Docker image `kileni-worker:rollback-20260826T174754Z`;
- архив исходников `/opt/kileni-seo-backups/source-20260826T174754Z.tar.gz`;
- согласованный backup данных `/data/backups/kileni-backup-20260826T174814095Z-22ba6f`.

Код возвращается переключением Compose на сохранённые image и пересозданием только `web`/`worker`, после чего обязательно проверяются health endpoint и логи. Восстановление базы — отдельная, потенциально разрушительная операция через `scripts/restore.mjs ... --confirm`; она нужна только при несовместимости данных и выполняется после отдельного подтверждения владельца. Автоматического downgrade миграций нет.

## Переменные окружения

В ZIP нет значений secrets. Безопасный `.env.example` в пакете содержит только пустые значения или локальные defaults.

Основные runtime/storage:

`NODE_ENV`, `APP_BASE_URL`, `ADMIN_BASE_URL`, `DATABASE_PATH`, `PRIVATE_UPLOADS_PATH`, `BACKUP_PATH`, `MIGRATION_SQL_PATH`, `PORT`, `BIND_ADDRESS`, `HEALTH_REQUIRE_WORKER`.

Защита и админка:

`IP_HASH_SALT`, `ADMIN_LOGIN`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`, `ADMIN_SESSION_HOURS`, `ADMIN_PDF_FONT_PATH`, `ADMIN_PDF_FONT_BOLD_PATH`, `AUDIT_RESTORE_SECRET`.

Публичные контакты и юридические данные:

`PUBLIC_PHONE`, `PUBLIC_EMAIL`, `PUBLIC_TELEGRAM`, `PUBLIC_MAX`, `PUBLIC_MAX_URL`, `PUBLIC_WHATSAPP`, `LEGAL_NAME`, `LEGAL_SHORT_NAME`, `LEGAL_ADDRESS`, `LEGAL_EMAIL`, `LEGAL_INN`, `LEGAL_OGRNIP`, `LEGAL_REGISTRATION_AUTHORITY`, `LEGAL_REGISTRATION_DATE`, `LEGAL_POLICY_VERSION`, `LEGAL_POLICY_URL`, `LEGAL_CONSENT_URL`.

Формы, аудит и worker:

`PRELAUNCH_MODE`, `FORMS_ENABLED`, `AUDIT_ENABLED`, `AUDIT_PAGE_LIMIT`, `AUDIT_TIMEOUT_MS`, `AUDIT_RESULT_RETENTION_DAYS`, `AUDIT_USER_AGENT`, `WORKER_POLL_MS`, `WORKER_POLL_INTERVAL_MS`, `LIGHTHOUSE_ENABLED`, `LIGHTHOUSE_CHROME_PATH`, `LIGHTHOUSE_NO_SANDBOX`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`.

Необязательные уведомления:

`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

Необязательные/альтернативные:

`NEXT_PUBLIC_EN_PRICE_CURRENCY`, `NEXT_PUBLIC_EN_PRICE_RATE`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `VERCEL`, `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, `BRIEF_FONT_REGULAR`, `BRIEF_FONT_BOLD`, `NODE_VERSION`.

Только для тестов:

`CI`, `E2E_PORT`, `E2E_RUN_ID`, `E2E_EXTERNAL_SERVER`, `KILENI_BASE_URL`.

## Состав безопасного пакета

Включены исходники приложения, worker, scripts, tests, pnpm lock-файл, Next/TypeScript/ESLint/PostCSS/Playwright/Vitest/Docker-конфигурация, миграции без данных, необходимые статические assets, выбранная техническая документация, README и этот файл.

Не включены `.git`, `.vercel`, все реальные env-файлы, secrets/keys/certificates, базы и dumps, backups, логи, пользовательские uploads, analytics/Lighthouse exports, сгенерированные отчёты и брифы, screenshots/research/meeting artifacts, caches, временные каталоги, `node_modules`, `.next`, `dist`, `dist-worker`, `build`, `out`, `.venv`, `bin`, `obj`.

Только в staging-копии ZIP реальные контактные/юридические fallback-значения обезличены. Оригинальный репозиторий и production из-за этого не изменялись.

CI-конфигурация в проекте отсутствует; добавлять выдуманный workflow в handoff не стали.
