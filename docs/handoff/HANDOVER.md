# Передача KILENI

Этот документ описывает исходники, эксплуатацию и ограничения по состоянию на 9 сентября 2026 года. Он не содержит паролей, токенов, клиентских данных и резервных копий.

## Состояние передачи

| Объект | Факт | Статус |
| --- | --- | --- |
| Рабочая ветка | `release/final-handoff-qa` | опубликована в GitHub и назначена веткой по умолчанию |
| Application commit | `c2097fd3dd518db6bc26df511dd4fb5b270a3687` | проверен; отмечен tag `v0.1.0-audit-stability-r2` |
| GitHub | [klxmycooperation-cpu/kileni-seo](https://github.com/klxmycooperation-cpu/kileni-seo) | приватный репозиторий; ветка, tag и GitHub release опубликованы |
| Production | [kileni-seo.ru](https://kileni-seo.ru/) | сайт отвечает; active web смонтирован из `/opt/kileni-seo-releases/20260908-forms-mail-fix/runtime`, а не из candidate `c2097fd3` |
| Админка | [kileni-seo.ru/admin](https://kileni-seo.ru/admin) | доступ требует отдельной администраторской учётной записи |
| Timeweb Cloud | [карточка сервера 8898503](https://timeweb.cloud/my/servers/8898503) | serial console доступна; SSH принимает только ключи, парольный вход root отключён |
| Подготовленный runtime | архив commit `c2097fd3`, SHA-256 `12aa07ff2ee2341607dd924baf77855073055a6ea5e3f96e81ee68a080f09b15` | готов к публикации, не переключён |
| Production data package | read-only export Turso/libSQL, SQLite backup, uploads и runtime-настройки | создан, проверен и зашифрован; выдача через ограниченный SFTP ожидает публичный SSH-ключ получателя |

Исходники переданы в GitHub. Production-копия подготовлена отдельно и не загружается в GitHub: в ней находятся клиентские данные и действующие runtime-настройки. Передача считается завершённой только после установки публичного SSH-ключа получателя, скачивания зашифрованного архива, сверки SHA-256 и отдельной передачи парольной фразы. Candidate `c2097fd3` ещё не опубликован на production и должен пройти server-side проверку до переключения.

## Что находится в репозитории

- `app/` — маршруты Next.js, API и административный интерфейс.
- `src/components/` — публичный интерфейс, формы, страницы и admin-компоненты.
- `src/lib/audit/` и `worker/` — очередь, обход публичных страниц, расчёт аудита и фоновые задачи.
- `src/db/` — схема, миграции, запросы и адаптер SQLite/libSQL.
- `src/lib/notifications/` — SMTP и Telegram-уведомления.
- `src/content/` и `src/config/` — RU/EN-контент, услуги, цены, калькулятор и настройки сайта.
- `public/` — разрешённые для публикации изображения, шрифты и сгенерированные DOCX/PDF-брифы.
- `deployment/`, `Dockerfile`, `docker-compose.yml` — контейнерный runtime.
- `scripts/` и `tests/` — миграции, backup/restore, сборка и тесты.

Не включайте в Git `.env*`, private keys, базы, дампы, uploads, `.next`, `node_modules`, `work/`, `tmp/`, временные отчёты и чужие материалы из общей рабочей папки.

## Стек и зависимости

Проект использует Next.js 16, React 19, TypeScript, pnpm, Node.js 22, Docker Compose v2, Caddy на production и отдельный Node.js worker. Локально применяется SQLite; production может работать через Turso/libSQL, если заданы оба `TURSO_*` значения. Фактический режим production обязан быть проверен в контейнерах перед любым backup, миграцией или переключением.

## Первый запуск

Работайте из корня клонированного репозитория. Нужны Node.js 22.13 или новее, Corepack, pnpm 10.33.0 и Docker для production-проверок.

```bash
corepack enable
corepack prepare pnpm@10.33.0 --activate
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm db:migrate
pnpm dev
```

Для разработки разрешены только локальные пути и тестовые credentials. Не подключайте production Turso, SMTP, Telegram, Turnstile или uploads к preview. После запуска web и worker должны отвечать на `http://localhost:3000/api/health`; worker должен стать `ok`.

## Переменные окружения

Значения берутся из защищённого менеджера секретов или передаются владельцем отдельно. `.env.example` содержит только шаблон.

| Группа | Переменные | Когда нужны | Где получить реальные значения |
| --- | --- | --- | --- |
| Runtime | `NODE_ENV`, `APP_BASE_URL`, `ADMIN_BASE_URL`, `PORT`, `BIND_ADDRESS` | всегда; production URL нужен runtime | владелец и конфигурация Timeweb |
| Данные | `DATABASE_PATH`, `PRIVATE_UPLOADS_PATH`, `BACKUP_PATH`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | local paths — для SQLite; оба `TURSO_*` — только при remote libSQL | серверный release или секретное хранилище |
| Админка и защита | `IP_HASH_SALT`, `AUDIT_RESTORE_SECRET`, `ADMIN_LOGIN`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`, `ADMIN_SESSION_HOURS` | production обязательно; restore secret нужен для serverless audit restore | новый владелец генерирует или получает через защищённый канал |
| Формы | `FORMS_ENABLED`, `AUDIT_ENABLED`, `PRELAUNCH_MODE`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | включение публичных мутаций и bot-защиты | владелец, Cloudflare Turnstile |
| Аудит и worker | `AUDIT_TIMEOUT_MS`, `AUDIT_RESULT_RETENTION_DAYS`, `AUDIT_USER_AGENT`, `WORKER_POLL_MS`, `WORKER_POLL_INTERVAL_MS`, `LIGHTHOUSE_ENABLED`, `LIGHTHOUSE_CHROME_PATH`, `LIGHTHOUSE_NO_SANDBOX`, `HEALTH_REQUIRE_WORKER` | управление ограничениями и health | инфраструктурная конфигурация |
| Почта и уведомления | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | только при включённом канале | почтовый и Telegram-владелец |
| Юридические данные | `LEGAL_*` | production и публичные документы | утверждённая карточка владельца; телефон и MAX сейчас меняются в `src/config/site.ts`, а не через `PUBLIC_*` |
| RU/EN цены | `NEXT_PUBLIC_EN_PRICE_CURRENCY`, `NEXT_PUBLIC_EN_PRICE_RATE` | только вместе для числовых EN-цен | коммерческое решение владельца |
| Только QA | `E2E_*`, `QA_*`, `KILENI_QA_OUTPUT_DIR`, `KILENI_BASE_URL` | локальные тесты, не production | тестовый runner |

Дополнительный `MIGRATION_SQL_PATH` применяется только в packaged runtime. `AUDIT_PAGE_LIMIT` — продуктовая константа, а не допустимый production override. Перед запуском production выполните `pnpm validate:launch`; команда останавливает запуск при неполных обязательных значениях.

На текущем commit публичные телефон и MAX фактически зафиксированы в `src/config/site.ts`; значения `PUBLIC_*` из `.env.example` не переопределяют их. До изменения публичных контактов нужно менять этот конфигурационный модуль и снова проходить визуальную и функциональную проверку. Это не секрет и не причина текущего сбоя, но важно для поддержки.

## Дальнейшие документы

- [Данные и восстановление](DATA_AND_RESTORE.md)
- [Публикация и откат](DEPLOYMENT.md)
- [Проверка](VERIFICATION.md)
- [Состояние исправлений](CHANGES.md)
- [Таблица приёмки](TRANSFER_ACCEPTANCE.md)
- [Архитектура](../architecture.md)
- [Исторический release handoff](../../SITE_HANDOFF.md)
