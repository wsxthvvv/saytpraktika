# Деплой на прод (Telegram / MAX / РБК)

Чистый статический хостинг (GitHub Pages, S3 без backend) **не** отправляет заявки в Telegram и **не** отдаёт `/api/rbc-news`. Для DoD нужен **Node-сервер** из `server/`.

## Архитектура

Один процесс `server/index.js` в production:

- `POST /api/leads` → Telegram и MAX (`server/leadNotifications.js`)
- `GET /api/rbc-news` → лента РБК
- `GET /api/health` → проверка деплоя
- остальные GET → каталог `build/` (React SPA)

Фронт по умолчанию шлёт заявки на **`/api/leads`** (тот же домен) — отдельный `REACT_APP_LEAD_API_URL` на проде обычно не нужен.

## Переменные (.env на сервере)

Скопируйте `.env.example` → `.env` и заполните **обязательно**:

| Переменная | Назначение |
|------------|------------|
| `TELEGRAM_BOT_TOKEN` | токен бота |
| `TELEGRAM_CHAT_ID` | чат/канал для заявок |
| `NODE_ENV` | `production` |
| `PORT` | `8080` (за nginx) |
| `HOST` | `0.0.0.0` в Docker; `127.0.0.1` за nginx на VPS |

Опционально: `MAX_WEBHOOK_URL`, `MAX_API_TOKEN`, `CORS_ORIGINS` (только если API на **другом** домене, чем сайт).

При сборке фронта на сервере те же `REACT_APP_*` из `.env.example` (ключи карт, Метрика, мессенджеры).

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
3. В панели задайте секреты: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, при необходимости MAX.
4. Привяжите свой домен `01-service.ru` в Render.

Health check: `/api/health`.

## Проверка после деплоя

1. `GET https://01-service.ru/api/health` — `"ok": true`, `"telegram": true` (если токены заданы).
2. Отправить тестовую заявку с формы «Контакты» — сообщение в Telegram.
3. Главная / блок новостей — «Обновить», карточки с rbc.ru (не только 3 заглушки).

## GitHub Actions (опционально)

Workflow `.github/workflows/deploy-production.yml` — ручной деплой на VPS по SSH (нужны secrets `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`).

## Чего не делать

- Не коммитьте `.env` с токенами.
- Не деплойте только `npm run build` на статический хост без прокси `/api/*` на Node.
