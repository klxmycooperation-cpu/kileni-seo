# SITE HANDOFF — KILENI

Снимок актуализирован 7 сентября 2026 года. Production работает из release `/opt/kileni-seo-releases/20260907-final-integration-rc3/runtime` со сборкой `SENFDQRfLN1EzZQY-cqkc`; web healthy, worker запущен, внешний `/api/health` возвращает `status=ok`, `database=ok`, `worker=ok`. RC3 опубликован после server-side preflight, backup и post-switch smoke. Реальные данные и secrets в пакет не копируются.

## Идентификация

- Публичный URL: `https://kileni-seo.ru`
- Настоящий исходный Git-репозиторий: `/Users/klmxy/Documents/zing-PROJECT`
- Git branch: `release/final-handoff-qa`
- Текущий commit SHA: `b9bd48745191b4f685f343a6bcba34ef53a3a258`
- Git remote URL: не настроен; `git remote -v` не возвращает remote.
- Репозиторий является источником текущей разработки. Deployed web root на сервере не использовался как замена исходникам.

## Состояние Git

`git status --short` показывает грязное рабочее дерево. Это важно: текущий SHA является базовой точкой, но не содержит незакоммиченные изменения. Точный кандидат RC3 зафиксирован build ID и полными manifests runtime; актуальный перечень незакоммиченных путей сохранён вместе с evidence. Release-пакет не содержит `.git`, secrets и пользовательские данные.

Основные группы изменений: приложение `app/`, исходники `src/`, worker, тесты, deployment-конфигурация, публичные assets и документация. В рабочем дереве также есть посторонние пользовательские материалы, screenshots, отчёты и временные каталоги; они не включаются в пакет.

Для получения точного актуального списка в исходном репозитории используется:

```bash
git status --short
```

## Стек и архитектура

- Framework: Next.js App Router `16.3.1` (зависимость в `package.json`: `^16.2.12`).
- UI runtime: React / ReactDOM `19.2.6`.
- Язык: TypeScript `5.9.3`.
- Требуемый Node.js: `>=22.13.0`; production image использует Node.js 22.
- Менеджер зависимостей: pnpm `10.33.0`; lock-файл — `pnpm-lock.yaml`.
- CMS отсутствует. Контент хранится в `src/content/` и конфигурационных TypeScript-файлах.
- Основное production-хранилище: удалённая Turso/libSQL. Локальная SQLite используется для preview, разработки и тестов; миграции без пользовательских данных находятся в `src/db/`.
- SEO-аудиты выполняет отдельный Node.js worker.
- Приложение не является IIS, статическим hosting или готовой CMS.

## Установка и локальный запуск

```bash
corepack enable
corepack prepare pnpm@10.33.0 --activate
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm db:migrate
pnpm dev
```

`pnpm dev` запускает web и worker. Раздельно:

```bash
pnpm dev:web
pnpm dev:worker
```

## Проверки, build и запуск

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm build
pnpm start
pnpm worker:start
```

`pnpm build` собирает Next.js standalone, помещает `public` и `_next/static` внутрь standalone-пакета и собирает `dist-worker/worker.js`. Это обязательно: standalone-сервер ищет клиентские ресурсы внутри собственного каталога.

## Текущий production deployment

- Площадка: Linux-сервер Timeweb Cloud, IP `72.56.249.36`.
- Checkout: `/opt/kileni-seo`.
- Запуск: Docker Engine + Docker Compose v2, project `kileni-seo`.
- Контейнеры: `kileni-seo-web-1`, `kileni-seo-worker-1`, `kileni-seo-caddy-1`.
- Web: Next.js standalone в Node.js container.
- Worker: отдельный Node.js container.
- HTTPS: Caddy reverse proxy.
- Production storage: Docker volume `kileni_data`; в исходный ZIP он не входит.
- Текущий release: `/opt/kileni-seo-releases/20260907-final-integration-rc3` (build `SENFDQRfLN1EzZQY-cqkc`), опубликован 7 сентября 2026 года пересозданием только web/worker.
- Непосредственный production rollback: `/opt/kileni-seo-releases/20260906-hmrs-final` (build `hMRsJgZvOWXEvY7S6UUSe`). Более ранний проверенный release также сохранён в `/opt/kileni-seo-releases/20260904T002637Z-prefetch-final`.
- Проверенный Next.js/worker runtime подключён read-only через `deployment/runtime-mount.compose.yml`; изменяемый Next cache хранится в отдельном Docker volume.
- Deployment выполняется вручную: backup, подготовка отдельного release-каталога, проверка Compose-конфигурации, затем пересоздание только web/worker. Общий Caddy изменяется только при необходимости маршрута или сертификата.
- В репозитории есть `docker-compose.yml` и файлы `deployment/`. Рабочие Compose-файлы и `.env` хранятся внутри каталога каждого server release; значения `.env` между релизами копируются только на сервере и не выгружаются локально.

Текущий сценарий запуска подготовленного runtime выполняется из каталога конкретного release. `.env` и `deployment/standalone.compose.yml` являются server-private файлами: перед проверкой нового release их копируют на сервере из действующего release, не выгружая значения локально.

```bash
cd /opt/kileni-seo-releases/<release>
# Backup — отдельный обязательный gate по docs/backup-and-restore.md.
# Текущий standalone-container не содержит /app/scripts/backup.mjs.
export KILENI_RUNTIME_DIR="$PWD/runtime"
docker compose \
  -p kileni-seo \
  -f docker-compose.yml \
  -f deployment/standalone.compose.yml \
  -f deployment/runtime-mount.compose.yml \
  up -d --no-build --force-recreate web worker
docker compose ps
```

Сценарий полной пересборки images по-прежнему доступен через `docker compose build --pull`, но для текущего runtime-релиза не применялся, чтобы не расходовать память и диск сервера повторной сборкой.

## Staging

Постоянного staging pipeline в Git/CI нет. 31 августа 2026 года для финальной проверки запущен отдельный QA-preview: `https://kileni-preview.72-56-249-36.sslip.io`.

Preview работает в отдельных web/worker containers, использует отдельную SQLite-базу и отдельный маршрут. Caddy отдаёт для него `X-Robots-Tag: noindex, nofollow, noarchive`. 6 сентября runtime каталога `/opt/kileni-preview/releases/20260905T1155MSK-isolated-final` обновлён до build `hMRsJgZvOWXEvY7S6UUSe`; перед обновлением сохранена копия `/opt/kileni-preview/releases/rollback-before-hmrs-0906`. Web healthy, worker с Chromium запущен, `/api/health` подтверждает базу и worker.

Во время финального gate обнаружено, что более ранняя конфигурация preview наследовала production Turso и внешние интеграции. Production runtime не переключался, однако ранние QA-аудиты могли создать записи в production-базе. Ничего из production не удалялось; точечная очистка допустима только после отдельного решения владельца и идентификации конкретных audit ID.

## Возврат предыдущего релиза

Автоматического rollback pipeline нет. Перед переключением на release `20260903T132024Z` создан локальный SQLite/uploads backup `/data/backups/kileni-backup-20260903T132355326Z-c4ce9d`. Он относится только к локальному Docker volume и не является копией основной Turso-базы. Ранее созданный полный SQL snapshot production Turso остаётся на сервере: `/data/backups/kileni-turso-backup-20260831T114927026Z-39b67c` (`database.sql`, SHA-256 `10a4b7658afb66b99ca2bfe02ef167bf176059267349a6b446a32c5702c83ebe`). Snapshot содержит персональные данные и остаётся только в закрытом server storage; в исходный ZIP он не входит.

После публикации RC3 откат кода выполняется переключением `KILENI_RUNTIME_DIR` на `/opt/kileni-seo-releases/20260906-hmrs-final/runtime` и пересозданием только web/worker, затем проверяются `/api/health`, контейнеры, статические файлы и логи. Caddy и другие домены при таком откате не меняются. Текущие миграции добавочные, поэтому обычный откат runtime не требует отката Turso. Восстановление данных из Turso snapshot — отдельная потенциально разрушительная ручная операция, допустимая только при повреждении данных и после отдельного подтверждения владельца; автоматического downgrade миграций нет.

Команда отката runtime выполняется из каталога предыдущего release:

```bash
cd /opt/kileni-seo-releases/20260906-hmrs-final
export KILENI_RUNTIME_DIR="$PWD/runtime"
docker compose \
  -p kileni-seo \
  -f docker-compose.yml \
  -f deployment/standalone.compose.yml \
  -f deployment/runtime-mount.compose.yml \
  up -d --no-build --force-recreate web worker
docker compose ps
curl --fail --silent --show-error https://kileni-seo.ru/api/health
```

## Необходимые переменные окружения

В этом документе и ZIP нет значений secrets. Разрешённый `.env.example` содержит только пустые значения или безопасные локальные defaults.

Runtime и storage:

`NODE_ENV`, `APP_BASE_URL`, `ADMIN_BASE_URL`, `DATABASE_PATH`, `PRIVATE_UPLOADS_PATH`, `BACKUP_PATH`, `MIGRATION_SQL_PATH`, `PORT`, `BIND_ADDRESS`, `HEALTH_REQUIRE_WORKER`.

Защита и админка:

`IP_HASH_SALT`, `ADMIN_LOGIN`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`, `ADMIN_SESSION_HOURS`, `ADMIN_PDF_FONT_PATH`, `ADMIN_PDF_FONT_BOLD_PATH`, `AUDIT_RESTORE_SECRET`.

Публичные и юридические данные:

`PUBLIC_PHONE`, `PUBLIC_MAX`, `PUBLIC_MAX_URL`, `LEGAL_NAME`, `LEGAL_SHORT_NAME`, `LEGAL_ADDRESS`, `LEGAL_EMAIL`, `LEGAL_EMAIL_VERIFIED`, `LEGAL_INN`, `LEGAL_OGRNIP`, `LEGAL_REGISTRATION_AUTHORITY`, `LEGAL_REGISTRATION_DATE`, `LEGAL_POLICY_VERSION`, `LEGAL_POLICY_URL`, `LEGAL_CONSENT_URL`.

Формы, аудит и worker:

`PRELAUNCH_MODE`, `FORMS_ENABLED`, `AUDIT_ENABLED`, `AUDIT_PAGE_LIMIT`, `AUDIT_TIMEOUT_MS`, `AUDIT_RESULT_RETENTION_DAYS`, `AUDIT_USER_AGENT`, `WORKER_POLL_MS`, `WORKER_POLL_INTERVAL_MS`, `LIGHTHOUSE_ENABLED`, `LIGHTHOUSE_CHROME_PATH`, `LIGHTHOUSE_NO_SANDBOX`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`.

Почта и необязательные уведомления:

`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

Альтернативные интеграции и тесты:

`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `NEXT_PUBLIC_EN_PRICE_CURRENCY`, `NEXT_PUBLIC_EN_PRICE_RATE`, `VERCEL`, `VERCEL_URL`, `CI`, `E2E_PORT`, `E2E_RUN_ID`, `E2E_EXTERNAL_SERVER`, `E2E_PRODUCTION_SERVER`, `KILENI_BASE_URL`.

## Состав безопасного пакета

В пакет включаются исходники `app/`, `src/`, `worker/`, scripts, tests, миграции без данных, lock-файл, project/build-конфигурация, Docker/deployment templates (включая `runtime-mount.compose.yml`), безопасные public assets, README, `IMPLEMENTATION_CHECKLIST.md` и этот файл.

При упаковке в копии заменяются на placeholders публичный телефон, прямая ссылка MAX и персональные реквизиты ИП. Рабочий репозиторий и production этой санитарной обработкой не изменяются. Реальные утверждённые значения должны передаваться только через защищённые runtime-переменные окружения.

Исключаются `.git`, `.vercel`, реальные env-файлы, secrets, keys, certificates, базы и dumps, backups, логи, пользовательские uploads, analytics exports, screenshots, research/meeting materials, сгенерированные отчёты, caches, `node_modules`, `.next`, `dist`, `dist-worker`, `build`, `out`, `.venv`, `bin`, `obj` и временные каталоги.

CI workflow в проекте отсутствует; выдуманный workflow в пакет не добавляется.
