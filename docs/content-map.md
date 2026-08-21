# Карта контента KILENI

Контент ведётся в двух локалях: русская версия без префикса и английская с префиксом `/en`. Переключатель языка сохраняет текущий путь. Для каждой индексируемой страницы нужны canonical и взаимные `hreflang`.

## Публичные страницы

| Назначение | RU | EN | Источник |
|---|---|---|---|
| Главная | `/` | `/en` | `src/components/home/HomePage.tsx`, `src/content/dictionary.ts` |
| Все услуги | `/services` | `/en/services` | `src/content/services.ts` |
| SEO-аудит | `/seo-audit` | `/en/seo-audit` | `src/content/services.ts` |
| SEO-продвижение | `/seo-promotion` | `/en/seo-promotion` | `src/content/services.ts` |
| Wildberries и Ozon | `/marketplaces` | `/en/marketplaces` | `src/content/services.ts` |
| Разработка | `/web-development` | `/en/web-development` | `src/content/services.ts` |
| Яндекс Реклама | `/yandex-ads` | `/en/yandex-ads` | `src/content/services.ts` |
| Цены | `/pricing` | `/en/pricing` | `src/config/prices.ts`, `src/content/services.ts` |
| Калькулятор | `/calculator` | `/en/calculator` | `src/config/calculator.ts` |
| Кейсы | `/cases` | `/en/cases` | `src/content/cases.ts` |
| Кейс eco-santeh.ru | `/cases/eco-santeh` | `/en/cases/eco-santeh` | `src/content/cases.ts`, `docs/case-evidence.md` |
| Кейс засорсервис.рф | `/cases/zasorservice` | `/en/cases/zasorservice` | `src/content/cases.ts`, `docs/case-evidence.md` |
| Онлайн-бриф и файлы | `/brief` | `/en/brief` | `src/content/brief.ts`, `public/downloads/generated/` |
| Блог | `/blog` | `/en/blog` | `src/content/articles.ts` |
| О компании | `/about` | `/en/about` | `src/components/pages/StaticPages.tsx` |
| Контакты | `/contacts` | `/en/contacts` | `src/config/site.ts` |
| Политика данных | `/privacy` | `/en/privacy` | `src/components/pages/StaticPages.tsx`, `src/config/site.ts` |
| Согласие | `/consent` | `/en/consent` | `src/components/pages/StaticPages.tsx`, `src/config/site.ts` |
| Бесплатная проверка | `/free-audit` | `/en/free-audit` | `src/components/pages/FreeAuditPage.tsx` |

Все цены централизованы в `src/config/prices.ts`. Английская версия показывает числовые суммы только при явной паре `NEXT_PUBLIC_EN_PRICE_CURRENCY` + `NEXT_PUBLIC_EN_PRICE_RATE`; без неё используется нейтральное `Individual estimate`. Автоматического пересчёта нет.

## Блог

Четыре темы опубликованы с одинаковыми slug в обеих локалях:

- `seo-audit-when-you-need-it` — когда нужен SEO-аудит;
- `why-website-is-not-in-search` — почему сайт не появляется в поиске;
- `seo-vs-yandex-ads` — выбор между SEO и Яндекс Рекламой;
- `wildberries-ozon-product-card` — карточка товара без переспама.

Текст, FAQ, оглавление, CTA, related-связи, дата и список источников находятся в `src/content/articles.ts`. Обложки — в `public/editorial/`. Старые пути `/articles/*` и `/en/articles/*` постоянно перенаправляются на `/blog/*` и `/en/blog/*`. При изменении slug нужно одновременно проверить маршрутизацию, related-связи, sitemap и входящие ссылки.

## Служебные страницы

- `/audit/{publicToken}` и `/en/audit/{publicToken}` — публичный прогресс и сокращённый результат; страницы закрыты от индексирования.
- `/admin/*` — вход, сводка, аудиты, заявки и брифы; закрыты от robots и требуют сессию.
- `/api/*` — CSRF, формы, очередь, SSE, healthcheck и административные операции; не являются контентом.

Старые пути `/collection`, `/fragrance/*` и `/where-to-buy` перенаправляются на актуальные разделы в `next.config.ts`.

## Где менять общие данные

| Данные | Файл или переменная |
|---|---|
| Название, базовый URL, контакты, юридические поля | `src/config/site.ts` и `.env` |
| Навигация и короткие UI-тексты | `src/content/dictionary.ts` |
| Услуги, пакеты, FAQ и ограничения | `src/content/services.ts` |
| Цены | `src/config/prices.ts` |
| Логика расчёта | `src/config/calculator.ts` |
| Кейсы | `src/content/cases.ts` |
| Блог | `src/content/articles.ts` |
| Вопросы онлайн-брифа | `src/content/brief.ts` |
| DOCX/PDF-брифы | `scripts/generate-briefs.mjs` |
| SEO defaults, OG и иконки | `app/layout.tsx`, `app/sitemap.ts`, `app/robots.ts`, `public/brand/` |

## Контроль публикации

Перед выпуском нового или изменённого материала:

1. Обновить обе локали без машинных заглушек.
2. Проверить фактические утверждения и сохранить первичные источники в статье.
3. Не обещать позиции, трафик, продажи или фиксированный срок эффекта без доказательств.
4. Проверить title, description, canonical, `hreflang`, один H1, оглавление и внутренние ссылки.
5. Добавить путь в sitemap, если это новая индексируемая страница.
6. Проверить мобильный layout, клавиатуру, контраст и состояние без JavaScript-анимации.
