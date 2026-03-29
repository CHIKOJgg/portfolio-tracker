# USD Portfolio Tracker v3 — Telegram Mini App

## Локальный запуск (2 команды)

### 1. Бэкенд
```bash
cd backend
npm install
# Создайте .env (скопируйте из .env.example и заполните DATABASE_URL)
npm run dev
# → 🚀 http://localhost:3001 [DEV]
# → [db] migrations ok
```

### 2. Фронтенд
```bash
cd frontend
npm install
# .env.local уже содержит VITE_API_URL=/api
npm run dev
# → http://localhost:5174
```

---

## .env для бэкенда (backend/.env)

```env
DEV_MODE=true
PORT=3001
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
CORS_ORIGINS=http://localhost:5174
```

**Бесплатная PostgreSQL:** [neon.tech](https://neon.tech) — 0.5GB навсегда, не требует кредитной карты.

---

## Деплой (бесплатно навсегда)

| Компонент  | Сервис            | Тариф   |
|------------|-------------------|---------|
| PostgreSQL | Neon.tech         | Free    |
| Backend    | Render.com        | Free    |
| Frontend   | Cloudflare Pages  | Free    |

### Render (бэкенд)
- Root: `backend` / Build: `npm install` / Start: `npm start`
- Env vars: `DATABASE_URL`, `BOT_TOKEN`, `DEV_MODE=false`, `CORS_ORIGINS=https://your.pages.dev`
- Добавьте Cron Job: `GET https://your-app.onrender.com/health` каждые 10 минут (против засыпания)

### Cloudflare Pages (фронтенд)
- Root: `frontend` / Build: `npm run build` / Output: `dist`
- Env var: `VITE_API_URL=https://your-app.onrender.com`

### Telegram Bot
```
@BotFather → /newapp → вставить URL Cloudflare Pages
```

---

## Исправленные баги (v3 vs v2)

1. ✅ `PUT /transactions` — сломанный update для `rate_usd` через SQL template literal
2. ✅ Симулятор — обращение к `.enriched` у cashMetrics которого не существовало → `.raw`
3. ✅ `GET /health` — не проверял БД, теперь делает `SELECT 1`
4. ✅ Нет `SIGTERM/SIGINT` graceful shutdown → добавлен
5. ✅ `auth_date` freshness не проверялась, нет `timingSafeEqual` → исправлено
6. ✅ `POST /rates/manual` не был защищён авторизацией → исправлено
7. ✅ `PUT /bond-params` перезаписывал поля дефолтами → читает текущие и мержит
8. ✅ `calcBondMetrics` вызывался с null bondParams → добавлена проверка
9. ✅ Frontend `api.bonds.update` vs `api.bonds.updateParams` несоответствие → унифицировано
10. ✅ Offline mode — белый экран при потере сети → кэш в localStorage
11. ✅ `api.transactions.remove` vs `.delete` несоответствие → унифицировано
12. ✅ Сломанный mkdir с brace expansion → исправлено

## Структура

```
backend/
  src/
    index.js          — Fastify + graceful shutdown + real health check
    db.js             — PostgreSQL pool (postgres.js)
    middleware/
      auth.js         — HMAC-SHA256 + timingSafeEqual + auth_date check
    routes/
      auth.js         — upsert user + bond_params init
      transactions.js — CRUD с правильным partial update
      bonds.js        — параметры выпуска с merge логикой
      portfolio.js    — параллельные запросы + null safety
      rates.js        — НБРБ cache + protected manual
      simulator.js    — uses fixed twx.js
    utils/
      migrate.js      — идемпотентные миграции
      twx.js          — TWX engine с .raw для симулятора

frontend/
  src/
    App.jsx           — auth flow + error screen
    store.jsx         — localStorage cache + offline state
    api/client.js     — unified API (remove not delete)
    hooks/
      useTelegram.js  — Telegram WebApp SDK wrapper
      useToast.jsx    — stacked toasts
    utils/calc.js     — TWX + форматирование + cache helpers
    components/
      UI.jsx          — переиспользуемые примитивы
      TabBar.jsx
      TransactionList.jsx  — swipe-to-delete
      TransactionForm.jsx  — live TWX preview
    pages/
      Dashboard.jsx   — offline banner + hero TWX
      CashPage.jsx    — полный CRUD
      BondsPage.jsx   — BYN/USD вкладки
      SettingsPage.jsx — симулятор + параметры + ручной курс
```
