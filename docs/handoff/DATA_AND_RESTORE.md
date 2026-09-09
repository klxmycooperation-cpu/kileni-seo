# Данные и восстановление

## Реестр хранилищ

| Хранилище | Назначение | Где находится | Backup и restore |
| --- | --- | --- | --- |
| Turso/libSQL, если заданы оба `TURSO_*` | production-заявки, брифы, аудиты, queue, notification events, admin notes | внешний сервис; endpoint и token только в secrets | штатный export/snapshot Turso; восстановление только в изолированную БД |
| SQLite | local development, preview или production без `TURSO_*` | `DATABASE_PATH`; в Docker обычно `/data/kileni.sqlite` | `pnpm backup`, затем `pnpm restore <backup> --confirm` |
| Private uploads | вложения брифов | `PRIVATE_UPLOADS_PATH`; в Docker обычно `/data/uploads` | копируются `scripts/backup.mjs` только если на них есть ссылки в snapshot |
| Docker volume `kileni_data` | локальная БД, uploads и локальные server backups | Timeweb host | не удалять с `docker compose down -v`; не считать заменой внешней копии |
| Release directories | только runtime-код, не клиентские данные | `/opt/kileni-seo-releases/` | сохраняются для code rollback; не заменяют backup данных |

`src/db/client.ts` выбирает Turso только когда заданы одновременно `TURSO_DATABASE_URL` и `TURSO_AUTH_TOKEN`; иначе приложение использует SQLite. Перед работой с production это надо подтвердить командой внутри активного web-контейнера, не по старому документу.

## Неподтверждённое состояние на 9 сентября

В старом server handoff упомянут Turso snapshot от 31 августа 2026 года. Он не является свежим backup и не должен считаться проверенным для передачи. Новый срез не создан: SSH и обе аварийные консоли Timeweb недоступны. Не заменяйте production данными из локальной `data/` или fixture-баз.

## Создание backup

Для SQLite используйте штатный скрипт из release, где доступны `scripts/backup.mjs`, `DATABASE_PATH` и `PRIVATE_UPLOADS_PATH`:

```bash
cd /opt/kileni-seo-releases/<active-release>
docker compose -p kileni-seo -f docker-compose.yml -f deployment/standalone.compose.yml \
  exec web node /app/scripts/backup.mjs --output /data/backups
```

Скрипт создаёт SQLite snapshot через backup API, выполняет integrity check, копирует только связанные вложения и записывает `manifest.json` с размером и SHA-256 каждого файла. Не копируйте один живой `.sqlite` файл вместе с WAL/SHM вручную.

9 сентября механизм проверен в полностью изолированной временной SQLite-базе: тестовый бриф и связанное с ним вложение вошли в backup, затем были восстановлены в новый каталог и прочитаны повторно. Это проверка механизма, а не подтверждение свежей production-копии.

Для Turso сначала используйте поддерживаемый экспорт/snapshot выбранного аккаунта Turso в отдельное закрытое хранилище. Затем сохраните имя, UTC-время, размер, SHA-256, версию схемы и число записей. Не публикуйте export, вложения или token в GitHub.

## Проверка и изолированное восстановление

1. Сверьте SHA-256 и размер каждого payload с manifest/export.
2. Восстановите копию в отдельный каталог и отдельную SQLite или отдельную Turso database.
3. Запустите web и worker с `FORMS_ENABLED=false`, пустыми SMTP/Telegram/Turnstile и отключённым production URL.
4. Выполните `PRAGMA integrity_check` и `PRAGMA foreign_key_check`.
5. Сверьте количество `audits`, `leads`, `brief_submissions`, `attachments`, `notification_events` и `worker_state` с источником среза.
6. Откройте несколько старых audit result/PDF, брифов и вложений через admin. Не запускайте восстановленные jobs и не отправляйте повторные письма.

Для SQLite restore изменяет текущую БД и uploads, поэтому выполнять его можно только в изолированной среде:

```bash
DATABASE_PATH=./restore/data/kileni.sqlite \
PRIVATE_UPLOADS_PATH=./restore/data/uploads \
BACKUP_PATH=./restore/backups \
pnpm restore /secure/path/kileni-backup-<timestamp> --confirm
```

После каждого production backup зашифруйте весь пакет вне Timeweb и передайте ссылку, контрольную сумму и отдельный ключ новому владельцу через согласованный защищённый канал.
