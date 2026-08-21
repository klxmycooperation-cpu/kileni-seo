# KILENI SEO

Двуязычный сайт SEO-агентства: услуги, цены, калькулятор, кейсы, статьи, онлайн-брифы, бесплатный автоматический аудит и закрытая админка. Русская версия открывается без префикса, английская — под `/en`.

## Что входит

- Next.js 16 и React 19;
- SQLite в WAL-режиме через `better-sqlite3` и Drizzle schema;
- отдельный worker для очереди SEO-аудитов;
- безопасный ограниченный crawler с SSRF-защитой;
- SSE с polling fallback для прогресса аудита;
- формы с Origin/CSRF, Zod, honeypot и rate limit;
- приватные вложения брифов вне `public/`;
- административные списки, статусы, заметки, экспорт и удаление;
- Telegram-уведомления;
- генерируемые RU/EN брифы DOCX и интерактивные PDF;
- Docker Compose: `web` + `worker` + общий persistent volume.

## Требования для локальной работы

- Node.js `>=22.13.0`;
- pnpm `10.33.0` через Corepack;
- TTF-шрифты с кириллицей для генерации PDF-брифов.

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
pnpm db:migrate
pnpm dev
```

По умолчанию web доступен на `http://localhost:3000`, а worker запускается параллельно. Значения для production нельзя оставлять равными development defaults.

## Окружение

Основные параметры перечислены в `.env.example`. Группы настроек:

- runtime и пути: `APP_BASE_URL`, `DATABASE_PATH`, `PRIVATE_UPLOADS_PATH`, `BACKUP_PATH`;
- защита: `IP_HASH_SALT`, `ADMIN_SESSION_SECRET`, `ADMIN_PASSWORD_HASH`;
- контакты и юридические данные: `PUBLIC_*`, `LEGAL_*`, `PRELAUNCH_MODE`;
- уведомления: `TELEGRAM_*`, опциональные `SMTP_*`;
- необязательная bot-защита: `TURNSTILE_SITE_KEY` вместе с `TURNSTILE_SECRET_KEY`;
- аудит: `AUDIT_PAGE_LIMIT`, `AUDIT_TIMEOUT_MS`, `AUDIT_CACHE_DAYS`, `AUDIT_RESULT_RETENTION_DAYS`, `WORKER_POLL_MS`;
- мобильные замеры: `LIGHTHOUSE_ENABLED`, `LIGHTHOUSE_CHROME_PATH`, `LIGHTHOUSE_NO_SANDBOX`;
- английские цены: `NEXT_PUBLIC_EN_PRICE_CURRENCY` и `NEXT_PUBLIC_EN_PRICE_RATE` — только явно утверждённая валюта и коммерческий курс.

Если заданы оба ключа Turnstile, виджет появляется во всех публичных формах, а сервер проверяет одноразовый токен. Без ключей Turnstile полностью отключён и формы продолжают работать. При настроенном SMTP пользователь с e-mail получает ссылку на завершённый аудит, а отправитель брифа — копию ответов. Ошибка внешнего канала не отменяет уже сохранённую заявку.

## Команды

```bash
pnpm dev                 # web + worker в watch-режиме
pnpm build               # Next production build + worker esbuild bundle
pnpm start               # только собранный web
pnpm worker:start        # собранный worker
pnpm db:migrate          # применить идемпотентную SQL-схему
pnpm db:check            # integrity check и WAL mode
pnpm generate:briefs     # создать 8 DOCX и 8 PDF
pnpm test                # unit/integration tests через Vitest
pnpm test:e2e            # Playwright
pnpm lint
pnpm typecheck
```

Web и worker можно запускать отдельно:

```bash
pnpm dev:web
pnpm worker
```

## Администратор

Точка входа — `http://localhost:3000/admin/login` (в production — тот же путь на публичном origin). Логин берётся из `ADMIN_LOGIN`, пароль сверяется только с bcrypt-хешем `ADMIN_PASSWORD_HASH`.

```bash
pnpm tsx scripts/hash-password.ts 'длинный-уникальный-пароль'
```

Для production также обязателен независимый `ADMIN_SESSION_SECRET` не короче 32 случайных символов. В админке доступны заявки, брифы, вложения, аудиты, полный JSON/PDF, заметки, статусы, перезапуск и удаление.

## Telegram и SMTP

Уведомления для `@myownmuz` настраиваются через bot token и числовой `TELEGRAM_CHAT_ID`; username сам по себе Bot API недостаточен. Полная последовательность приведена в [инструкции Telegram](docs/telegram-setup.md).

Для e-mail задайте `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` и `SMTP_FROM`. Отправка выполняется только для контакта, прошедшего серверную e-mail-валидацию. Без SMTP публичная ссылка всё равно доступна и копируется на странице результата.

## Где менять контент

- цены и скидки: `src/config/prices.ts`;
- коэффициенты калькулятора: `src/config/calculator.ts`;
- услуги, кейсы и словари: `src/content/`;
- статьи и связанные материалы: `src/content/articles.ts`;
- контакты и юридические реквизиты: `.env` (`PUBLIC_*`, `LEGAL_*`);
- логотипы, favicon и OG: `public/brand/` и `public/favicon.svg`.

Пустые публичные контакты скрываются. Числовые цены EN появляются только когда одновременно заданы `NEXT_PUBLIC_EN_PRICE_CURRENCY` и `NEXT_PUBLIC_EN_PRICE_RATE`; иначе платные услуги показывают `Individual estimate`, а бесплатная проверка остаётся `Free`. Автоматического или резервного курса нет.

Операционные скрипты можно запускать напрямую:

```bash
node scripts/backup.mjs
node scripts/restore.mjs /путь/к/kileni-backup-... --confirm
```

Для Linux задайте пути к TTF перед генерацией брифов:

```bash
BRIEF_FONT_REGULAR=/path/to/regular.ttf \
BRIEF_FONT_BOLD=/path/to/bold.ttf \
pnpm generate:briefs
```

## Docker

```bash
cp .env.example .env
# заполнить production-значения и chmod 600 .env
docker compose build
docker compose up -d
curl --fail http://127.0.0.1:${PORT:-3000}/api/health
```

Compose публикует web только на loopback. Для публичного доступа нужен TLS reverse proxy с корректным Host/Origin и поддержкой SSE. Не запускайте несколько web-реплик поверх этой SQLite-топологии.

## Структура

```text
app/                 Next.js pages, API, admin, metadata
src/components/      UI, формы и страницы
src/content/         RU/EN услуги, кейсы, статьи и брифы
src/config/          цены, калькулятор и настройки сайта
src/db/              schema, SQL migrations и запросы SQLite
src/lib/audit/       crawler, анализ и scoring
src/lib/security/    CSRF, sessions, rate limit и файлы
worker/              фоновая обработка аудитов
scripts/             миграции, briefs, backup/restore
public/              бренд, редакционные SVG и загрузки
tests/               unit, integration и e2e
docs/                архитектура и эксплуатация
```

## Документация

- [Архитектура](docs/architecture.md)
- [Формула предварительной SEO-оценки](docs/audit-scoring.md)
- [Карта контента](docs/content-map.md)
- [Развёртывание](docs/deployment.md)
- [Безопасность](docs/security.md)
- [Telegram](docs/telegram-setup.md)
- [Backup и restore](docs/backup-and-restore.md)
- [Источники ассетов](docs/assets-sources.md)
- [Доказательная база кейсов](docs/case-evidence.md)
- [Анализ референса](docs/reference-analysis.md)
- [Рыночное исследование](docs/market-research.md)

## Production gate

Перед выпуском заполните реальные юридические данные и контакты, проверьте пароль админки, Telegram/SMTP, формы, worker heartbeat, Lighthouse, резервное копирование и тестовое восстановление. Production-сервер выводит явное предупреждение, если обязательные `LEGAL_*` пусты. Только после проверки документов юристом переключайте `PRELAUNCH_MODE=false`: приложение не заявляет автоматическую полную юридическую совместимость.

База, полные результаты и вложения находятся вне `public/`. Бесплатный аудит ограничен 100 HTML-страницами, примерно семью минутами, одной активной задачей на домен и доменным кешем на семь дней; точные URL и доказательства остаются только в админском отчёте. Завершённые аудиты автоматически удаляются worker-ом по `AUDIT_RESULT_RETENTION_DAYS` (не менее 90 дней). Автоматическая отправка форм, обход авторизации/CAPTCHA и активное сканирование уязвимостей не выполняются.
