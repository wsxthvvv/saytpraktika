# 01 SERVICE — сайт практики

React-приложение ООО «Рутрекер Технолоджи» (01service). Фирменные требования: **`01 SERVICE_GUIDELINES.pdf`** в корне репозитория.

## Фирменный стиль

| Элемент | Реализация |
|--------|------------|
| **Цвета** | CSS-переменные в `src/App.css` (`--brand-red` #E2001A, серые #58595B / #B2B4B6, чёрный/белый) |
| **Логотип** | `src/components/BrandLogo.jsx` — шапка (горизонталь + слоган), подвал (компакт) |
| **Favicon** | `public/favicon.svg` — «01» на красном круге |
| **Шрифт** | **Inter** (Google Fonts) — аналог ITC Officina Sans; запасные: IBM Plex Sans, PT Sans, system-ui |

## Запуск (локально)

1. `npm install`
2. Скопируйте `.env.example` → **`.env`**, задайте **`POSTGRES_PASSWORD`** и тот же пароль в **`DATABASE_URL`** (как в примере).
3. Поднимите PostgreSQL (Docker Desktop должен быть запущен):

```bash
npm run db:up
```

4. **Два терминала** в папке проекта:

```bash
npm run server     # терминал 1 — API на http://127.0.0.1:3001
npm start          # терминал 2 — сайт на http://localhost:3000
```

Если в терминале с `npm start` видите **Proxy error (EACCES)** — почти всегда **не запущен** `npm run server` или нет `.env` / базы. Сначала в терминале 1 должно появиться: `01service API + DB http://...:3001`.

**Ошибка `28P01` / auth_failed** — в `.env` в `DATABASE_URL` должен быть порт **`5434`** (база из Docker), не `5432`. Запустите Docker Desktop → `npm run db:reset` → `npm run server`. Если порт занят — см. `ports` в `docker-compose.yml`.

После смены `proxy` в `package.json` перезапустите `npm start`.

### Админ-панель (`/admin`)

1. В `.env` задайте `ADMIN_USERNAME` и `ADMIN_PASSWORD_HASH` (хеш пароля):

```bash
npm run admin:hash-password -- "ВашСекретныйПароль"
```

Скопируйте вывод в `ADMIN_PASSWORD_HASH`, перезапустите `npm run server`.

2. Откройте **http://localhost:3000/admin** (логин из `ADMIN_USERNAME`, обычно `admin`, или email `admin@local.admin`).

В панели: боковое меню, обзор, заявки/заказы/отзывы/клиенты с **поиском и пагинацией на сервере**, CSV, **каталог** (редактирование ПК и майнеров в БД — сразу на `/products` и `/mining`), **журнал действий** админа. На `/api/auth/login` — **rate limit** (защита от перебора пароля). Доступ к API только с ролью `admin`.

## Сборка

```bash
npm run build
```

## Production (заявки Telegram/MAX, новости РБК)

Локально API и фронт разделены (`npm run server` + `npm start`). На **проде** один Node-процесс отдаёт и `build/`, и `/api/*`:

```bash
# в .env: NODE_ENV=production, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, PORT=8080
npm run build
npm run start:prod
```

Или Docker: `docker compose up -d --build`.

Подробно: **[DEPLOY.md](./DEPLOY.md)** (nginx, systemd, Render, GitHub Actions).

Проверка: `GET /api/health` → `"telegram": true`; тестовая заявка с сайта.

---

Остальная документация Create React App: [CRA deployment](https://create-react-app.dev/docs/deployment/).
