# Деплой на прод (Telegram / MAX / РБК)

Чистый статический хостинг (GitHub Pages, S3 без backend) **не** отправляет заявки в Telegram и **не** отдаёт `/api/rbc-news`. Для DoD нужен **Node-сервер** из `server/`.

## Архитектура

Один процесс `server/index.js` в production:

- `POST /api/leads` → Telegram и MAX (`server/leadNotifications.js`)
- `GET /api/rbc-news` → лента РБК
- `GET /api/health` → проверка деплоя
- остальные GET → каталог `build/` (React SPA)

Для пользователей, заказов и отзывов используется PostgreSQL. Сервер при первом запуске создаёт таблицы и администратора из `ADMIN_USERNAME` и `ADMIN_PASSWORD_HASH`.

Фронт по умолчанию шлёт заявки на **`/api/leads`** (тот же домен) — отдельный `REACT_APP_LEAD_API_URL` на проде обычно не нужен.

## Переменные (.env на сервере)

Скопируйте `.env.example` → `.env` и заполните **обязательно**:

| Переменная | Назначение |
|------------|------------|
| `TELEGRAM_BOT_TOKEN` | токен бота |
| `TELEGRAM_CHAT_ID` | чат/канал для заявок |
| `TELEGRAM_BOT_ENABLED` | `true`, чтобы включить polling-бота услуг; только на одном процессе |
| `NODE_ENV` | `production` |
| `PORT` | `8080` (за nginx) |
| `HOST` | `0.0.0.0` в Docker; `127.0.0.1` за nginx на VPS |
| `DATABASE_URL` | строка подключения PostgreSQL |
| `DATABASE_SSL` | `true` для облачного PostgreSQL с TLS |
| `ADMIN_USERNAME` | логин администратора |
| `ADMIN_PASSWORD_HASH` | bcrypt-хеш с cost 12 или выше; создаётся командой `npm run admin:hash-password -- "длинный-пароль"`. При записи в `.env` для Docker замените каждый `$` на `$$`. |

Опционально: `PUBLIC_TELEGRAM_BOT_URL` (также можно сохранить ссылку в админ-панели), `MAX_WEBHOOK_URL`, `MAX_API_TOKEN`, `YANDEX_GEOCODER_API_KEY`, `CORS_ORIGINS` (только если API на **другом** домене, чем сайт).

При сборке фронта задайте публичный ключ JavaScript API Яндекс.Карт (`REACT_APP_YANDEX_MAPS_API_KEY`) с ограничением по домену. Серверный `YANDEX_GEOCODER_API_KEY` используется только для запасного определения адреса и не попадает в бандл. При необходимости задайте `REACT_APP_YANDEX_METRIKA_ID` и публичные ссылки мессенджеров.

## Вариант A — Docker (рекомендуется)

На VPS с Docker:

```bash
git clone https://github.com/wsxthvvv/saytpraktika.git
cd saytpraktika
cp .env.example .env
# отредактируйте .env (Telegram, при необходимости REACT_APP_* для build внутри образа)
docker compose up -d --build
curl -s http://127.0.0.1:8080/api/health
```

Compose поднимает PostgreSQL с volume `postgres-data` и передаёт приложению `DATABASE_URL`. Перед первым production-запуском обязательно замените `POSTGRES_PASSWORD` и `ADMIN_PASSWORD_HASH`.

Перед `docker compose build` можно экспортировать build-args для CRA (если нужны ключи в бандле):

```bash
export $(grep -v '^#' .env | xargs)
docker compose build --no-cache
docker compose up -d
```

Для production-домена поставьте nginx/Caddy с TLS — см. `deploy/nginx-01-service.conf.example`.

## Вариант B — без Docker (systemd)

```bash
cd /var/www/01service
git pull
npm ci
npm run build
# .env: NODE_ENV=production, PORT=8080, TELEGRAM_*
sudo systemctl restart 01service
```

Unit-файл: `deploy/systemd-01service.service.example`.

## Вариант C — Render.com

1. Подключите репозиторий GitHub.
2. **New → Blueprint** и укажите `render.yaml`, либо Web Service с Dockerfile.
3. В панели задайте секреты: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_BOT_ENABLED=true`, `PUBLIC_TELEGRAM_BOT_URL`, при необходимости MAX.
4. Привяжите свой домен `01-service.ru` в Render.

Health check: `/api/health`.

## Резервная копия и восстановление PostgreSQL

В Docker Compose сервис `db-backup` создаёт архив сразу после запуска, затем повторяет резервное копирование ежедневно. По умолчанию он хранит 14 дней копий в `./backups` и проверяет структуру каждого архива через `pg_restore --list`. Папка исключена из Git. Настройки периода и срока хранения задаются через `BACKUP_INTERVAL_SECONDS` и `BACKUP_RETENTION_DAYS`.

Копии на том же сервере не защищают от потери сервера. Переносите их на отдельное защищённое хранилище и ограничьте доступ.

Периодически проверяйте восстановление в отдельную временную базу. Эта команда не трогает рабочую базу:

```bash
docker compose exec -T db-backup sh -ec '
  archive=$(find /backups -type f -name "${POSTGRES_DB}-*.dump" | sort | tail -n 1)
  test -n "$archive"
  check_db="restore_check_$(date +%s)"
  createdb --host=db --username="$POSTGRES_USER" --template=template0 "$check_db"
  trap '\''dropdb --if-exists --host=db --username="$POSTGRES_USER" "$check_db"'\'' EXIT
  pg_restore --exit-on-error --no-owner --no-acl --host=db --username="$POSTGRES_USER" --dbname="$check_db" "$archive"
  psql --host=db --username="$POSTGRES_USER" --dbname="$check_db" --command="SELECT COUNT(*) FROM users"
'
```

Если нужно вручную восстановить данные, сначала создайте отдельную пустую базу, проверьте её, и только затем согласуйте переключение приложения. Не выполняйте восстановление поверх единственной рабочей базы.

Для хостингов без Docker Compose настройте ежедневный `pg_dump` в планировщике хостинга и проводите такую же проверку восстановления в отдельной базе.

## Проверка после деплоя

1. `GET https://01-service.ru/api/health` — `"ok": true`, `"database": true`, `"telegramConfigured": true` (если токены заданы).
2. Отправить тестовую заявку с формы «Контакты» — сообщение в Telegram.
3. Главная / блок новостей — «Обновить», карточки с rbc.ru (не только 3 заглушки).

## GitHub Actions (опционально)

Workflow `.github/workflows/deploy-production.yml` — ручной деплой на VPS по SSH (нужны secrets `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`).

## Чего не делать

- Не коммитьте `.env` с токенами.
- Не деплойте только `npm run build` на статический хост без прокси `/api/*` на Node.
