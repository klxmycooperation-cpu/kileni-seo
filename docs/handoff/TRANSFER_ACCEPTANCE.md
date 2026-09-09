# Таблица приёмки передачи

| Объект | Где находится | Что передано | Как проверено | Статус |
| --- | --- | --- | --- | --- |
| Исходный код | ветка `release/final-handoff-qa` | application commit `c2097fd3` и история локальных веток | `git fsck --full`, source bundle SHA-256 `971d8ba7c243f3bf9de1932b7562fcc4f78eb41f1c68c6e5ec84d71276d05e4a` | локально сохранён; GitHub pending |
| Согласованные UI-правки | `app/`, `src/`, `public/`, tracked screenshots | код, assets, regression tests и исторические QA-документы | lint, typecheck, 626 tests, production build и 452 Playwright scenarios on production build | локально verified |
| Application release | full Linux runtime commit `c2097fd3` | immutable artifact SHA-256 `12aa07ff2ee2341607dd924baf77855073055a6ea5e3f96e81ee68a080f09b15` | 33 406 files, 710 symlink, Linux native dependencies, 0 package secrets | prepared; production pending |
| GitHub release/tag | правильный KILENI repository | commit, tag, release artifact | remote отсутствует; repository не идентифицирован | blocked |
| Production runtime | Timeweb server 8898503 | switch только web/worker с rollback path | public health доступен; active release и candidate switch нельзя проверить без SSH/console | blocked |
| Схема и миграции | `src/db/`, packaged runtime | versioned schema and migrations | test suite and build passed | ready for GitHub |
| Production database | Turso/libSQL или SQLite — подтвердить внутри web container | свежий consistent backup с row counts | production access unavailable | blocked |
| Uploads и документы пользователей | production private storage | backup, manifest, hashes, restore proof | production access unavailable | blocked |
| Конфигурационный шаблон | `.env.example`, [HANDOVER.md](HANDOVER.md) | template without secrets | staged secret-pattern scan found no credential value | ready for GitHub |
| Deploy/restore instructions | `docs/handoff/` | exact compose switch, rollback, backup and verification procedures | cross-checked with current compose files and runtime mount; isolated SQLite backup/restore with a brief and attachment passed | ready for GitHub |
| Полный test report | current local commit | lint, typecheck, Vitest, build, Playwright | lint, typecheck, 626 Vitest tests, production build и 452 Chromium/WebKit Playwright scenarios passed; external integrations were disabled | локально verified |
| Clean clone from GitHub | future clean directory | clone, install, restore isolated data, start web/worker | impossible until correct remote is available | blocked |
| Secrets and data package | separate encrypted storage selected by owner | credentials, DB dump, uploads, recovery key | no destination and no fresh production backup | pending owner/infrastructure |

Статус `blocked` не означает, что данные удалены или релиз откатан. Он означает, что действие не выполнялось без необходимого доступа или без идентификации точного внешнего ресурса.
