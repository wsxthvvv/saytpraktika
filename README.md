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

**Ошибка `28P01` / auth_failed** — проверьте, что в `.env` пароль в `DATABASE_URL` совпадает с `POSTGRES_PASSWORD`, а порт — **`5434`** (база из Docker), не `5432`. Запустите Docker Desktop → `npm run db:up` → `npm run server`. Если порт занят — см. `ports` в `docker-compose.yml`.

После смены `proxy` в `package.json` перезапустите `npm start`.

### Админ-панель (`/admin`)

1. В `.env` задайте `ADMIN_USERNAME` и `ADMIN_PASSWORD_HASH` (bcrypt-хеш; пароль не хранится в открытом виде):

```bash
npm run admin:hash-password -- "ВашСекретныйПароль"
```

Команда требует пароль не короче 12 символов. Скопируйте bcrypt-строку из вывода в `ADMIN_PASSWORD_HASH`, затем запустите `npm run server`.

2. Откройте **http://localhost:3000/admin** (логин из `ADMIN_USERNAME`, обычно `admin`, или email `admin@local.admin`).

В панели: боковое меню, обзор, заявки/заказы/отзывы/клиенты с **поиском и пагинацией на сервере**, CSV, **каталог** (редактирование ПК и майнеров в БД — сразу на `/products` и `/mining`), **журнал действий** админа. На `/api/auth/login` — **rate limit** (защита от перебора пароля). Доступ к API только с ролью `admin`.

Для оформления заказа нужен аккаунт покупателя. Корзина гостя объединяется с корзиной аккаунта после входа.

## Сборка

```bash
npm run build
```

## Production (заявки Telegram/MAX, новости РБК)

Локально API и фронт разделены (`npm run server` + `npm start`). На **проде** один Node-процесс отдаёт и `build/`, и `/api/*`:

```bash
# в .env: NODE_ENV=production, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_BOT_ENABLED=true, PORT=8080
npm run build
npm run start:prod
```

### Telegram-бот услуг

Создайте бота через BotFather и укажите его токен в `TELEGRAM_BOT_TOKEN`. Для запуска встроенного polling-бота задайте `TELEGRAM_BOT_ENABLED=true` и оставьте только один процесс приложения с этим флагом. В `PUBLIC_TELEGRAM_BOT_URL` укажите ссылку вида `https://t.me/имя_бота`, затем в админ-панели сохраните её в поле «Ссылка Telegram-бота».

Бот принимает `/start`, показывает услуги и deep link с сайта, запрашивает согласие на обработку данных, имя, телефон и описание задачи. Заявка сохраняется в PostgreSQL с источником `telegram` и попадает в общий список заявок и очередь уведомлений. Цены услуг в боте не указываются: их согласует менеджер.

Или Docker: `docker compose up -d --build`.

Подробно: **[DEPLOY.md](./DEPLOY.md)** (nginx, systemd, Render, GitHub Actions).

Для Docker в bcrypt-хеше `ADMIN_PASSWORD_HASH` экранируйте символы `$` как `$$`; приложение восстановит исходный хеш при запуске.

В DEPLOY.md также описаны создание и восстановление резервной копии PostgreSQL.

Проверка: `GET /api/health` → `"telegram": true`; тестовая заявка с сайта.

---

Остальная документация Create React App: [CRA deployment](https://create-react-app.dev/docs/deployment/).
