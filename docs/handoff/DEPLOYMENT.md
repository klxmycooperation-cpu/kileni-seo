# Публикация и откат

## До публикации

1. Используйте serial console Timeweb или SSH-ключ владельца. Парольный SSH-вход отключён; не включайте его ради публикации. Не переустанавливайте ОС и не удаляйте server/volume.
2. Active runtime уже определён по read-only mount `/app` контейнера `kileni-seo-web-1`: `/opt/kileni-seo-releases/20260908-forms-mail-fix/runtime`. Перед каждым новым переключением всё равно сверяйте mount и Compose labels, а не полагайтесь на этот документ.
3. Сверьте активные Compose labels и exact config files. Сохраните путь как `$active` для отката.
4. Используйте подготовленный зашифрованный production package как исходный срез для изолированной проверки. Перед любым новым переключением создайте ещё один fresh backup по [DATA_AND_RESTORE.md](DATA_AND_RESTORE.md).
5. Передайте на сервер единственный полный artifact, а не набор файлов из разных сборок.

Подготовленный artifact для `c2097fd3` имеет SHA-256 `12aa07ff2ee2341607dd924baf77855073055a6ea5e3f96e81ee68a080f09b15`, build ID `A-x7mMbc1h-vtjmDHUy6h`, 33 406 файлов и 710 проверенных относительных symlink. Он содержит Linux x86-64 native dependencies. Его нельзя смешивать с `node_modules`, migration или worker от активного release.

## Проверка кандидата на сервере

Пусть `$target` — новый, ранее не существующий каталог `/opt/kileni-seo-releases/<date>-c2097fd3`. Сначала сверьте SHA-256 полученного архива и распакуйте его в `$target`. Скопируйте в новый release только server-private `.env` и `deployment/standalone.compose.yml` из активного release; не выгружайте их на локальный компьютер и не кладите в архив.

Проверьте migrations, `runtime/dist-worker/worker.js`, `runtime/server.js`, `.next/static`, `public` и `node_modules` кандидата. Затем проверьте итоговую Compose-конфигурацию:

```bash
KILENI_RUNTIME_DIR="$target/runtime" docker compose -p kileni-seo \
  -f /opt/kileni-seo/docker-compose.yml \
  -f "$target/deployment/standalone.compose.yml" \
  -f "$target/deployment/runtime-mount.compose.yml" config -q
```

Перед переключением запустите candidate изолированно либо используйте существующий preview с отдельной БД и отключёнными SMTP/Telegram. Второй worker не должен видеть production queue.

## Переключение

При успешных health и smoke-проверках переключаются только `web` и `worker`:

```bash
KILENI_RUNTIME_DIR="$target/runtime" docker compose -p kileni-seo \
  -f /opt/kileni-seo/docker-compose.yml \
  -f "$target/deployment/standalone.compose.yml" \
  -f "$target/deployment/runtime-mount.compose.yml" \
  up -d --no-build --force-recreate web worker
```

Не выполняйте `docker compose down -v`, не пересоздавайте Caddy без необходимости и не копируйте `migration.sql` или `node_modules` из предыдущего release. Последнее было источником смешанных runtime-пакетов в старом publish-script.

После switch требуются `/api/health` с `status=ok`, `database=ok`, `auditRunner=worker`, `worker=ok` и `/api/audit/health` с ready/healthy status. Выполните не менее десяти внешних health-запросов в течение 15 минут, затем пройдите [VERIFICATION.md](VERIFICATION.md).

## Откат

Если health или smoke не проходят, не трогайте данные и Caddy. Переключите только web/worker на сохранённый `$active/runtime` тем же Compose invocation. Затем проверьте health, static assets и логи. Миграции в candidate добавочные; восстановление данных — отдельная операция и не является обычным code rollback.
