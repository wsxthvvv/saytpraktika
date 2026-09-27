# Production: один контейнер — React build + API (Telegram/MAX, РБК)
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY public ./public
COPY src ./src
COPY server ./server
ARG REACT_APP_TELEGRAM_URL
ARG REACT_APP_MAX_CHAT_URL
ARG REACT_APP_LEAD_API_URL=/api/leads
ARG REACT_APP_YANDEX_MAPS_API_KEY
ARG REACT_APP_AUTH_PEPPER
ARG REACT_APP_YANDEX_METRIKA_ID
ENV REACT_APP_TELEGRAM_URL=$REACT_APP_TELEGRAM_URL \
    REACT_APP_MAX_CHAT_URL=$REACT_APP_MAX_CHAT_URL \
    REACT_APP_LEAD_API_URL=$REACT_APP_LEAD_API_URL \
    REACT_APP_YANDEX_MAPS_API_KEY=$REACT_APP_YANDEX_MAPS_API_KEY \
    REACT_APP_AUTH_PEPPER=$REACT_APP_AUTH_PEPPER \
    REACT_APP_YANDEX_METRIKA_ID=$REACT_APP_YANDEX_METRIKA_ID
RUN npm run build

FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY --from=build /app/build ./build
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s \
  CMD node -e "fetch('http://127.0.0.1:8080/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.js"]
