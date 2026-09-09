# Таблица приёмки передачи

| Объект | Где находится | Что передано | Как проверено | Статус |
| --- | --- | --- | --- | --- |
| Исходный код | [GitHub: `release/final-handoff-qa`](https://github.com/klxmycooperation-cpu/kileni-seo/tree/release/final-handoff-qa) | application commit `c2097fd3`, история ветки и документация передачи | source bundle SHA-256 `971d8ba7c243f3bf9de1932b7562fcc4f78eb41f1c68c6e5ec84d71276d05e4a`; чистый GitHub clone прошёл установку, миграцию, lint, typecheck, tests и build | опубликован и проверен |
| Согласованные UI-правки | `app/`, `src/`, `public/`, tracked screenshots | код, assets, regression tests и исторические QA-документы | lint, typecheck, 626 tests, production build и 452 Playwright scenarios on production build | локально verified |
| Application release | full Linux runtime commit `c2097fd3` | immutable artifact SHA-256 `12aa07ff2ee2341607dd924baf77855073055a6ea5e3f96e81ee68a080f09b15` | 33 406 files, 710 symlink, Linux native dependencies, 0 package secrets | prepared; production pending |
| GitHub release/tag | [release `v0.1.0-audit-stability-r2`](https://github.com/klxmycooperation-cpu/kileni-seo/releases/tag/v0.1.0-audit-stability-r2) | tag указывает на application commit `c2097fd3`; release содержит порядок проверки artifact | GitHub release и tag опубликованы в приватном репозитории | опубликован |
| Production runtime | Timeweb server 8898503 | active release и rollback path определены | serial console подтверждает active mount `/opt/kileni-seo-releases/20260908-forms-mail-fix/runtime`; candidate switch ещё не выполнялся | candidate pending |
| Схема и миграции | `src/db/`, packaged runtime | versioned schema and migrations | test suite, build и чистая изолированная миграция прошли | опубликовано в GitHub |
| Production database | active Turso/libSQL, экспорт в защищённом пакете | SQLite export со схемой и row counts | 59 audits, 6 leads, 5 brief submissions, integrity и foreign-key checks прошли | подготовлено к передаче |
| Uploads и документы пользователей | private storage, внутри защищённого пакета | штатный backup, manifest и связанное вложение | manifest содержит 2 payload-файла: database и upload | подготовлено к передаче |
| Конфигурационный шаблон | `.env.example`, [HANDOVER.md](HANDOVER.md) | template without secrets | staged secret-pattern scan found no credential value | опубликовано в GitHub |
| Deploy/restore instructions | `docs/handoff/` | exact compose switch, rollback, backup and verification procedures | cross-checked with current compose files and runtime mount; isolated SQLite backup/restore with a brief and attachment passed | опубликовано в GitHub |
| Полный test report | current local commit | lint, typecheck, Vitest, build, Playwright | lint, typecheck, 626 Vitest tests, production build и 452 Chromium/WebKit Playwright scenarios passed; external integrations were disabled | локально verified |
| Clean clone from GitHub | новая временная копия ветки `release/final-handoff-qa` | clone, install, изолированная миграция, lint, typecheck, tests и production build | выполнено с `.env.example` в роли локального шаблона; внешние сервисы не подключались | проверен |
| Secrets and data package | отдельный зашифрованный архив и restricted SFTP | credentials, DB dump, uploads, runtime settings, SHA-256 | archive успешно расшифрован и проверен на сервере; доступ ожидает публичный SSH-ключ получателя | ожидается ключ получателя |

Статус `candidate pending` означает, что выпуск `c2097fd3` не переключён на production. Это не отменяет готовность исходников и защищённого data package, но запрещает называть site fix опубликованным до server-side проверки.
