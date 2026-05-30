# Meta Ads Dashboard — руководство проекта

Этот проект — инструмент для **аналитики и управления рекламой Meta** (Facebook/Instagram).
Управлять рекламой можно **двумя способами**:

1. **Через терминал** — скрипт `scripts/ads.mjs` (рекомендуется для работы через Claude Code).
2. **Через веб-дашборд** — Next.js приложение (`npm run dev`).

Доступы уже настроены в `.env` (токен Meta + база данных). Всё, что создаётся, по умолчанию
ставится на паузу (**PAUSED**) — реальные траты не идут, пока объект явно не активируют.

---

## ⚡ Быстрый старт (управление через Claude Code в терминале)

Оператор пишет задачу обычными словами, Claude выполняет её командой `scripts/ads.mjs`.
Сначала всегда полезно посмотреть список аккаунтов:

```bash
node scripts/ads.mjs accounts
```

Затем работать с нужным аккаунтом (`act_...` из списка).

> **Node 18+** обязателен (используется встроенный `fetch`). Установлен Node 22.
> Зависимости: `npm install` (для `export --format xlsx` нужен пакет `exceljs`, он уже в зависимостях).

---

## 🖥️ Терминальный CLI — `scripts/ads.mjs`

Полная справка: `node scripts/ads.mjs help`

### Просмотр
```bash
node scripts/ads.mjs whoami
node scripts/ads.mjs accounts                          # рекламные аккаунты
node scripts/ads.mjs pages                             # страницы Facebook
node scripts/ads.mjs posts --page <PAGE_ID>            # посты страницы (для продвижения)
node scripts/ads.mjs pixels --account act_123          # пиксели
node scripts/ads.mjs audiences --account act_123       # custom / lookalike аудитории
node scripts/ads.mjs interests --q "фитнес"            # поиск интересов для таргетинга
node scripts/ads.mjs campaigns --account act_123
node scripts/ads.mjs adsets --account act_123 [--campaign <CAMPAIGN_ID>]
node scripts/ads.mjs ads --account act_123 [--adset <ADSET_ID>]
```

### Создание (по отдельности)
```bash
# Кампания
node scripts/ads.mjs campaign:create --account act_123 --name "Лето 2026" \
  --objective OUTCOME_TRAFFIC [--daily-budget 500] [--special-categories ""]

# Группа объявлений (бюджет/таргетинг/оптимизация). Бюджет в ЦЕНТАХ: 500 = $5.00
node scripts/ads.mjs adset:create --account act_123 --campaign <CAMPAIGN_ID> \
  --name "US 18-45 фитнес" --optimization LINK_CLICKS --billing IMPRESSIONS \
  --daily-budget 500 --countries US --age-min 18 --age-max 45
#   расширенный таргетинг: --targeting-file targeting.json
#   оптимизация под конверсии (event-реклама): --optimization OFFSITE_CONVERSIONS --pixel <PIXEL_ID> --event PURCHASE

# Объявление из существующего поста (object_story_id = "<PAGE_ID>_<POST_ID>", берётся из `posts`)
node scripts/ads.mjs ad:create --account act_123 --adset <ADSET_ID> \
  --name "Объявление 1" --post <PAGEID_POSTID>
```

### Создание всей воронки одним файлом (с автооткатом при сбое)
```bash
node scripts/ads.mjs publish --account act_123 --file examples/funnel.example.json
```
Формат файла — см. `examples/funnel.example.json`:
```json
{
  "campaign": { "name": "...", "objective": "OUTCOME_SALES", "special_ad_categories": [], "daily_budget": 1000 },
  "adSet": {
    "name": "...", "daily_budget": 1000, "optimization_goal": "OFFSITE_CONVERSIONS", "billing_event": "IMPRESSIONS",
    "targeting": { "geo_locations": { "countries": ["US"] }, "age_min": 18, "age_max": 65 },
    "promoted_object": { "pixel_id": "<PIXEL_ID>", "custom_event_type": "PURCHASE" }
  },
  "ad": { "name": "...", "object_story_id": "<PAGE_ID>_<POST_ID>" }
}
```

### Управление
```bash
node scripts/ads.mjs status --id <ID> --status ACTIVE      # запустить
node scripts/ads.mjs status --id <ID> --status PAUSED      # на паузу
node scripts/ads.mjs budget --id <ID> --daily 1000         # изменить дневной бюджет (центы)
node scripts/ads.mjs delete --id <ID>                      # удалить
```
`<ID>` — id кампании, группы или объявления (Meta использует один эндпоинт для всех уровней).

### Отчёты и выгрузка
```bash
node scripts/ads.mjs insights --account act_123 --level campaign            # в терминал
node scripts/ads.mjs insights --account act_123 --level ad --since 2026-05-01 --until 2026-05-30
node scripts/ads.mjs export --account act_123 --format csv --level adset     # → файл .csv
node scripts/ads.mjs export --account act_123 --format xlsx --level ad --out report.xlsx
```

### Токен
```bash
node scripts/ads.mjs token:refresh   # обменять текущий токен на новый долгоживущий (~60 дней)
```

---

## 📋 Рецепты «обычными словами → команда» (для Claude)

| Запрос оператора | Что выполнить |
|---|---|
| «Покажи мои рекламные аккаунты» | `accounts` |
| «Какие кампании у аккаунта NexPos» | найти `act_...` через `accounts`, затем `campaigns --account act_...` |
| «Создай traffic-кампанию на $10/день для act_X» | `campaign:create --account act_X --name "..." --objective OUTCOME_TRAFFIC --daily-budget 1000` |
| «Сделай группу на США, 18-45, $5/день, под клики» | `adset:create ... --optimization LINK_CLICKS --billing IMPRESSIONS --daily-budget 500 --countries US --age-min 18 --age-max 45` |
| «event-реклама / оптимизация под покупки» | `adset:create ... --optimization OFFSITE_CONVERSIONS --pixel <id> --event PURCHASE` (пиксель из `pixels`) |
| «Продвинь пост страницы» | `posts --page <id>` → взять id поста → `ad:create ... --post <PAGEID_POSTID>` |
| «Запусти / останови кампанию» | `status --id <id> --status ACTIVE` / `PAUSED` |
| «Подними бюджет до $20/день» | `budget --id <id> --daily 2000` |
| «Выгрузи отчёт за май в Excel» | `export --account act_X --format xlsx --since 2026-05-01 --until 2026-05-31 --level campaign` |

Цели кампаний (`--objective`): `OUTCOME_SALES`, `OUTCOME_LEADS`, `OUTCOME_ENGAGEMENT`,
`OUTCOME_TRAFFIC`, `OUTCOME_AWARENESS`, `OUTCOME_APP_PROMOTION`.
Цели оптимизации (`--optimization`): `OFFSITE_CONVERSIONS`, `LINK_CLICKS`, `LANDING_PAGE_VIEWS`,
`REACH`, `IMPRESSIONS`, `POST_ENGAGEMENT`, `LEAD_GENERATION`.

---

## 🌐 Веб-дашборд

```bash
npm install
npm run dev        # http://localhost:3000
```
Страницы: `/dashboard` (аналитика), `/campaigns` (иерархия), `/ads/new` (мастер создания рекламы),
`/reports` (отчёты + экспорт CSV/XLSX), `/login` (вход через Meta).

> Вход через веб требует настроенного OAuth в Meta (redirect URI, login config). Для терминала
> это **не нужно** — там работает токен напрямую.

---

## 🔑 Конфигурация (`.env`)

| Переменная | Назначение |
|---|---|
| `META_USER_TOKEN` | Долгоживущий токен Meta для CLI (истекает ~60 дней; обновить `token:refresh`) |
| `META_APP_ID` / `META_APP_SECRET` | Приложение Meta (для обмена токена) |
| `META_GRAPH_VERSION` | Версия Graph API (напр. `v23.0`) |
| `META_LOGIN_CONFIG_ID` | Configuration ID для веб-входа (Facebook Login for Business) |
| `META_PERMISSIONS` | Запрашиваемые права |
| `DATABASE_URL` | Postgres/Supabase (для веб-дашборда; CLI БД не использует) |
| `DIRECT_DB_URL` | Прямое подключение для миграций (`npm run db:migrate`) |
| `JWT_SECRET` | Подпись сессий веб-дашборда |

⚠️ `.env` в `.gitignore` — в git не попадает, но передаётся вместе с папкой. Токен и секреты —
конфиденциальны.

---

## 🧱 Архитектура (где что лежит)

- `scripts/ads.mjs` — **терминальный CLI** (самодостаточный, прямой вызов Graph API).
- `lib/server/services/metaClient.ts` — HTTP-клиент Graph API (read + write) для веб-части.
- `lib/server/services/adManagementService.ts` — оркестратор публикации (PAUSED, аудит, откат).
- `lib/server/services/reportService.ts` + `exporters/` — отчёты и экспорт CSV/XLSX.
- `pages/ads/new.tsx`, `components/ads/*` — мастер создания рекламы (UI).
- `pages/reports/index.tsx` — отчёты (UI).
- `lib/server/db/migrations/*.sql` — схема БД (`npm run db:migrate`).
- `docs/superpowers/specs/` и `docs/superpowers/plans/` — спецификация и планы реализации.

---

## ✅ Безопасность и правила

- Всё создаётся **PAUSED** — траты не идут, пока не активируете (`status --status ACTIVE`).
- Бюджеты — в **минорных единицах** (центах): `500` = `$5.00`.
- Для прода/других пользователей нужен **App Review** Meta на `ads_management` + Business
  Verification. Владельцу приложения в dev-режиме всё работает сразу.
- Тесты: `npm test`. Сборка: `npm run build`.
