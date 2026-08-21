# KILENI Signal Rebuild Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Привести сайт KILENI к утверждённой product-Signal концепции: понятный первый экран, нативные аналитические визуализации, честный бесплатный аудит до 10 страниц, три полноценные темы и предсказуемые пользовательские сценарии.

**Architecture:** Сохраняем существующий Next.js-проект, маршруты и данные. Визуализации строим штатными React/SVG-компонентами и CSS-анимациями, без PNG в интерфейсе. Интерактивное состояние ограничиваем Client Components; серверные данные и результат аудита остаются источником правды для реального процесса.

**Tech Stack:** Next.js, React, TypeScript, CSS, SVG, Playwright, Vitest.

---

### Task 1: Зафиксировать новые публичные границы бесплатного аудита

**Files:**
- Modify: `src/config/site.ts`
- Modify: `src/components/home/HeroScan.tsx`
- Modify: `src/components/forms/AuditForm.tsx`
- Modify: `src/components/pages/FreeAuditPage.tsx`
- Modify: `app/page.tsx`, `app/en/page.tsx`, `app/[...slug]/page.tsx`, `app/en/[...slug]/page.tsx`
- Modify: focused tests for config and public copy

**Step 1: Write failing tests**
- Проверить, что публичный и серверный лимиты равны 10, а старый клиентский параметр не может повысить его.

**Step 2: Run tests to verify they fail**
- Run the focused unit and browser tests.

**Step 3: Implement minimal production change**
- Сделать лимит 10 единым источником правды и заменить устаревший публичный текст в RU/EN.

**Step 4: Run focused tests**
- Confirm the exact public copy and API payloads are consistent.

### Task 2: Перерисовать hero-график «Поисковая видимость»

**Files:**
- Modify: `src/components/analytics/AnalyticsVisuals.tsx`
- Modify: `app/home-10.css`
- Modify: focused hero E2E test

**Step 1: Write failing test**
- Проверить наличие подробной нативной визуализации, подписи «Пример визуализации», контрольных точек и корректного поведения на мобильном экране.

**Step 2: Run test to verify it fails**
- Run the focused hero test.

**Step 3: Implement the native SVG chart**
- Добавить сетку, последовательную линию/точки, естественные просадки, контрольные точки, итоговое значение, компактные KPI и семантические цвета.
- Сохранить reduced-motion и скрывать демо-график при старте настоящего аудита.

**Step 4: Run focused test**
- Verify desktop and mobile rendering without horizontal overflow.

### Task 3: Сделать реальный процесс аудита ясным и устойчивым

**Files:**
- Modify: `src/components/forms/AuditForm.tsx`
- Modify: `src/components/forms/AuditLiveProgress.tsx`
- Modify: `app/audit-progress-refinement.css`
- Modify: focused audit E2E tests

**Step 1: Write failing scenario**
- Проверить двухшаговую форму, замену демо на progress UI, отсутствие огромного текста и корректное завершение/ошибку.

**Step 2: Implement progress UI**
- Нативный прогресс с этапами, метриками, живым статусом и адаптацией к темам, без фальшивых результатов.

**Step 3: Verify full local user journey**
- Проверить ввод URL, контакт, запуск, события и возвращаемый результат.

### Task 4: Доработать темы, навигацию и базовую композицию

**Files:**
- Modify: `src/components/layout/SiteHeader.tsx`
- Modify: `app/theme.css`, `app/home-10.css`
- Modify: focused theme/navigation E2E tests

**Step 1: Implement the 3-theme contract**
- Dark, Signal, Light с одним semantic token layer и сохранением выбора.

**Step 2: Verify navigation and mobile menu**
- Dropdown остаётся открытым при переходе курсора, работает мышью, клавиатурой и touch.

### Task 5: Пересобрать ключевые продуктовые экраны и доказательства

**Files:**
- Modify: cases, services, pricing, brief and articles components/content/styles

**Step 1: Implement factual case cards**
- Показать обе подтверждённые пары метрик и не использовать неподтверждённые данные.

**Step 2: Add remaining native analytics blocks**
- Техническая оценка, органический трафик, ошибки и CTR — с явной маркировкой demo там, где данные не являются результатом конкретного клиента.

**Step 3: Simplify buyer journeys**
- Услуги, цены, бриф и статьи должны отвечать на задачи клиента, а не заполнять экран общим текстом.

### Task 6: Финальная локальная проверка

**Files:**
- Modify: relevant tests only when coverage is missing

**Step 1: Run typecheck, focused unit/e2e and build**
- Исправить только найденные регрессии в пределах задачи.

**Step 2: Run local desktop/mobile smoke**
- Проверить темы, графики, навигацию, форму и отсутствие горизонтального/бесконечного скролла.

**Step 3: Report only verified behavior**
- Не публиковать на Vercel без отдельного запроса.
