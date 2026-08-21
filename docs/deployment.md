# Развёртывание KILENI

Поддерживаемый production-сценарий — один Linux-хост с Docker Engine и Docker Compose v2, один контейнер `web`, один контейнер `worker` и общий именованный том `kileni_data`. TLS и публичный домен обслуживает внешний reverse proxy.

## 1. Подготовить окружение

```bash
cp .env.example .env
chmod 600 .env
```

Заполните `.env`. Обязательный минимум перед открытием форм:

- `APP_BASE_URL` — точный публичный HTTPS origin без завершающего пути;
- `DATABASE_PATH=/data/kileni.sqlite`;
- `PRIVATE_UPLOADS_PATH=/data/uploads`;
- `BACKUP_PATH=/data/backups`;
- независимые `IP_HASH_SALT` и `ADMIN_SESSION_SECRET` длиной от 32 символов;
- `ADMIN_LOGIN` и `ADMIN_PASSWORD_HASH`;
- `LEGAL_NAME`, `LEGAL_ADDRESS`, `LEGAL_EMAIL`, `LEGAL_INN`;
- `LEGAL_POLICY_VERSION` — версия опубликованных условий;
- рабочие публичные контакты или пустые значения, чтобы скрыть их.

Сгенерировать два независимых секрета можно так:

```bash
openssl rand -base64 48
openssl rand -base64 48
```

Создать bcrypt-хеш после установки зависимостей:

```bash
node --input-type=module -e \
  "import bcrypt from 'bcryptjs'; console.log(await bcrypt.hash(process.argv[1], 12))" \
  '<НОВЫЙ_ДЛИННЫЙ_ПАРОЛЬ>'
```

В `.env` bcrypt-хеш лучше заключить в одинарные кавычки, чтобы символы `$` остались литеральными. Сам пароль после генерации в файл не записывайте.

`PRELAUNCH_MODE` оставьте `true`, пока юридические данные и пользовательские сценарии не проверены. Числовые цены EN включаются только парой `NEXT_PUBLIC_EN_PRICE_CURRENCY` + `NEXT_PUBLIC_EN_PRICE_RATE`. Без обеих переменных платные услуги показывают `Individual estimate`; автоматического или резервного курса нет.

## 2. Собрать и запустить

```bash
docker compose build
docker compose up -d
docker compose ps
```

Web при старте применяет идемпотентный SQL из `src/db/migrations.ts` и выполняет `PRAGMA integrity_check`. Worker запускается после успешного healthcheck web. Оба контейнера используют `/data` из одного persistent volume.

Порт по умолчанию доступен только на `127.0.0.1:3000`. Изменить host-порт можно переменной `PORT`, не меняя внутренний порт контейнера.

## 3. Настроить reverse proxy

Reverse proxy должен:

- завершать TLS и перенаправлять HTTP на HTTPS;
- проксировать на `127.0.0.1:${PORT:-3000}`;
- передавать корректные `Host` и `X-Forwarded-Proto`;
- удалять пользовательский `X-Forwarded-For` и формировать доверенный заголовок самостоятельно;
- не буферизовать SSE-маршрут `/api/audits/*/events` и не обрывать долгие соединения преждевременно;
- ограничить размер запроса как минимум согласованно с лимитом вложений 10 МБ плюс multipart overhead;
- при возможности ограничить `/admin` отдельным сетевым правилом.

`APP_BASE_URL` должен в точности совпадать с публичным origin, иначе Origin/CSRF-проверка отклонит формы.

## 4. Проверить запуск

```bash
curl --fail --silent --show-error http://127.0.0.1:${PORT:-3000}/api/health
docker compose logs --tail=100 web
docker compose logs --tail=100 worker
```

Health endpoint проверяет SQLite и показывает состояние heartbeat воркера. Compose healthcheck считает web готовым по доступности базы, чтобы избежать циклической зависимости запуска; внешний монитор должен дополнительно проверять, что поле `worker` равно `ok` после старта.

Затем вручную проверьте:

1. RU и EN главные страницы.
2. Получение CSRF и отправку тестовой заявки.
3. Вход в `/admin` и появление тестовой заявки.
4. Создание бесплатного аудита, смену статусов и итоговую страницу.
5. Загрузку допустимого вложения и скачивание только из авторизованной админки.
6. Telegram-уведомление, если канал включён.

## Обновление

Перед обновлением создайте backup и сохраните его вне Docker-хоста. Затем:

```bash
docker compose exec web node /app/scripts/backup.mjs
docker compose build --pull
docker compose up -d
docker compose ps
```

Проверяйте логи и health после каждого обновления. Текущие миграции только добавляют отсутствующие объекты; автоматического downgrade нет. При несовместимом изменении схемы требуется отдельная миграция и заранее проверенный план отката.

## Остановка

```bash
docker compose stop
```

Compose посылает `SIGTERM`: web получает до 30 секунд, worker — до 45 секунд. Не используйте `docker compose down -v` в обычной эксплуатации: флаг `-v` удалит persistent volume с базой и вложениями.

## Ограничения топологии

Не увеличивайте `web` до нескольких реплик и не переносите SQLite на произвольный сетевой диск. Для горизонтального масштабирования сначала вынесите базу, очередь, rate limit и вложения во внешние сервисы с подходящей согласованностью.

Подробнее: [архитектура](architecture.md), [безопасность](security.md), [backup/restore](backup-and-restore.md).
