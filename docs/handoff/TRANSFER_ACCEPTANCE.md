# Таблица приёмки передачи

| Объект | Где находится | Что передано | Как проверено | Статус |
| --- | --- | --- | --- | --- |
| Исходный код | [GitHub: `release/final-handoff-qa`](https://github.com/klxmycooperation-cpu/kileni-seo/tree/release/final-handoff-qa) | application commit `c2097fd3`, история ветки и документация передачи | source bundle SHA-256 `971d8ba7c243f3bf9de1932b7562fcc4f78eb41f1c68c6e5ec84d71276d05e4a`; чистый GitHub clone прошёл установку, миграцию, lint, typecheck, tests и build | опубликован и проверен |
| Согласованные UI-правки | `app/`, `src/`, `public/`, tracked screenshots | код, assets, regression tests и исторические QA-документы | lint, typecheck, 626 tests, production build и 452 Playwright scenarios on production build | локально verified |
| Application release | full Linux runtime commit `c2097fd3` | immutable artifact SHA-256 `12aa07ff2ee2341607dd924baf77855073055a6ea5e3f96e81ee68a080f09b15` | 33 406 files, 710 symlink, Linux native dependencies, 0 package secrets | prepared; production pending |
| GitHub release/tag | [release `v0.1.0-audit-stability-r2`](https://github.com/klxmycooperation-cpu/kileni-seo/releases/tag/v0.1.0-audit-stability-r2) | tag указывает на application commit `c2097fd3`; release содержит порядок проверки artifact | GitHub release и tag опубликованы в приватном репозитории | опубликован |
| Production runtime | Timeweb server 8898503 | switch только web/worker с rollback path | public health доступен; active release и candidate switch нельзя проверить без SSH/console | blocked |
| Схема и миграции | `src/db/`, packaged runtime | versioned schema and migrations | test suite, build и чистая изолированная миграция прошли | опубликовано в GitHub |
| Production database | Turso/libSQL или SQLite — подтвердить внутри web container | свежий consistent backup с row counts | production access unavailable | blocked |
| Uploads и документы пользователей | production private storage | backup, manifest, hashes, restore proof | production access unavailable | blocked |
| Конфигурационный шаблон | `.env.example`, [HANDOVER.md](HANDOVER.md) | template without secrets | staged secret-pattern scan found no credential value | опубликовано в GitHub |
| Deploy/restore instructions | `docs/handoff/` | exact compose switch, rollback, backup and verification procedures | cross-checked with current compose files and runtime mount; isolated SQLite backup/restore with a brief and attachment passed | опубликовано в GitHub |
| Полный test report | current local commit | lint, typecheck, Vitest, build, Playwright | lint, typecheck, 626 Vitest tests, production build и 452 Chromium/WebKit Playwright scenarios passed; external integrations were disabled | локально verified |
| Clean clone from GitHub | новая временная копия ветки `release/final-handoff-qa` | clone, install, изолированная миграция, lint, typecheck, tests и production build | выполнено с `.env.example` в роли локального шаблона; внешние сервисы не подключались | проверен |
| Secrets and data package | separate encrypted storage selected by owner | credentials, DB dump, uploads, recovery key | no destination and no fresh production backup | pending owner/infrastructure |

Статус `blocked` не означает, что данные удалены или релиз откатан. Он означает, что действие не выполнялось без необходимого доступа или без идентификации точного внешнего ресурса.
