# 01 SERVICE — сайт практики

React-приложение ООО «Рутрекер Технолоджи» (01service). Фирменные требования: **`01 SERVICE_GUIDELINES.pdf`** в корне репозитория.

## Фирменный стиль

| Элемент | Реализация |
|--------|------------|
| **Цвета** | CSS-переменные в `src/App.css` (`--brand-red` #E2001A, серые #58595B / #B2B4B6, чёрный/белый) |
| **Логотип** | `src/components/BrandLogo.jsx` — шапка (горизонталь + слоган), подвал (компакт) |
| **Favicon** | `public/favicon.svg` — «01» на красном круге |
| **Шрифт** | **Inter** (Google Fonts) — аналог ITC Officina Sans; запасные: IBM Plex Sans, PT Sans, system-ui |

## Запуск

```bash
npm install
npm start          # фронт :3000
npm run server     # API :3001 (заявки, новости РБК)
```

Переменные окружения — см. `.env.example`.

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
