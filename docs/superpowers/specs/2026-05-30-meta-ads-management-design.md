# Управление рекламой Meta через дашборд — дизайн

**Дата:** 2026-05-30
**Проект:** `meta-analytics-web` (Next.js 16, Pages Router, React 19, Postgres, Marketing API)
**Статус:** утверждён в брейнсторминге, ожидает реализации

---

## 1. Цель

Превратить текущий **read-only дашборд аналитики Meta Ads** в инструмент, который позволяет
**создавать и настраивать рекламу** прямо из веб-интерфейса: кампании → группы объявлений →
объявления, управлять ими (пауза/бюджет/удаление), а также строить отчёты и выгружать данные.

## 2. Решения, принятые в брейнсторминге

| Вопрос | Решение |
|--------|---------|
| Где работаем | В существующем веб-дашборде (расширяем Next.js-приложение). «Терминал» = панель управления. |
| Что создаём | Кампании, группы объявлений, объявления |
| Креативы | **Только существующие посты** FB/IG (без загрузки медиа) |
| Таргетинг | **Расширенный**: гео, возраст, пол, языки, интересы/детальный, custom audiences, lookalike, ретаргетинг, исключения, плейсменты |
| «Event»-реклама | Оптимизация под **события-конверсии** (Meta Pixel / CAPI): Purchase, Lead, AddToCart и т.д. |
| Отчёты/экспорт | Уровни: кампании/группы/объявления. Форматы: **CSV + Excel (XLSX)**. Генерация on-demand. |
| Модель безопасности | **Вариант C — гибрид с оркестратором публикации** |

## 3. Принцип безопасности (вариант C)

- Всё создаётся в статусе **PAUSED** — траты не идут, пока пользователь явно не активирует.
- Перед публикацией — подтверждение.
- Каждая операция записи логируется в аудит-таблицу `ad_operations`.
- При частичном сбое (например, кампания создана, группа — нет) — **автоматический откат**
  уже созданных объектов этого funnel.
- Состояние мастера держится на клиенте до финального submit (без тяжёлой системы черновиков).

---

## 4. Архитектура

```
UI: мастер создания + кнопки управления + страница отчётов
  └─ pages/ads/new.tsx, компоненты шагов, pages/reports/index.tsx
       │ (через lib/api.ts)
       ▼
API-роуты (pages/api/*): POST/PATCH/DELETE + прокси справочников + отчёты
       ▼
Сервисы:
  • adManagementService — оркестратор: валидация → создание по порядку → PAUSED → аудит → откат
  • reportService       — собирает датасет из metricsService + иерархии
  • exporters/{csv,xlsx} — генерация файлов
       ▼
MetaClient (расширяем): write-методы (POST/DELETE) + чтение справочников
       ▼
Postgres: новая таблица ad_operations (иерархия уже есть) + Graph API (Marketing API)
```

**Ключевой принцип:** `MetaClient` остаётся тонким HTTP-клиентом (как сейчас); вся логика
безопасности и оркестрации — в `adManagementService`. Это изолирует риск и упрощает тесты.

---

## 5. Модель данных

Новая миграция `lib/server/db/migrations/007_ad_operations.sql`:

```sql
CREATE TABLE IF NOT EXISTS ad_operations (
  id            BIGSERIAL PRIMARY KEY,
  account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  meta_user_id  TEXT NOT NULL,
  operation_type TEXT NOT NULL,          -- create_campaign | create_adset | create_ad |
                                         -- update_status | update_budget | delete | export_report
  level         TEXT,                    -- campaign | adset | ad
  meta_object_id TEXT,                   -- id созданного/изменённого объекта в Meta
  request_payload JSONB,
  response       JSONB,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | success | failed | rolled_back
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_operations_account
  ON ad_operations (account_id, created_at DESC);
```

Иерархия (кампании/группы/объявления) уже хранится и синхронизируется — отдельные таблицы не нужны.

---

## 6. Бэкенд

### 6.1 MetaClient — новые методы

`lib/server/services/metaClient.ts` (расширяем существующий класс):

**Write:**
- `createCampaign(adAccountId, token, payload)` → `POST /act_<id>/campaigns`
- `createAdSet(adAccountId, token, payload)` → `POST /act_<id>/adsets`
- `createAdCreativeFromPost(adAccountId, token, { name, object_story_id })` → `POST /act_<id>/adcreatives`
- `createAd(adAccountId, token, { name, adset_id, creative_id, status })` → `POST /act_<id>/ads`
- `updateObject(objectId, token, fields)` → `POST /<id>` (статус/бюджет)
- `deleteObject(objectId, token)` → `DELETE /<id>`

**Read (справочники для мастера):**
- `getPages(token)` → `GET /me/accounts` (страницы пользователя)
- `getPromotablePosts(pageId, token)` → `GET /<page_id>/ads_posts` (включая dark posts)
- `getAdPixels(adAccountId, token)` → `GET /act_<id>/adspixels`
- `getCustomAudiences(adAccountId, token)` → `GET /act_<id>/customaudiences` (lookalike = subtype LOOKALIKE)
- `getSavedAudiences(adAccountId, token)` → `GET /act_<id>/saved_audiences`
- `searchInterests(token, q)` → `GET /search?type=adinterest`
- `searchGeo(token, q)` → `GET /search?type=adgeolocation`
- `getDeliveryEstimate(adAccountId, token, targeting, optimization_goal)` → `GET /act_<id>/delivery_estimate`

Все write-запросы идут через тот же per-account Bottleneck-лимитер и retry-логику, что и чтение.
Для записи использовать `http.post`/`http.delete` (сейчас есть только `get`).

> Точные наборы полей и значения enum проверить против закреплённой версии Graph API при реализации
> (Marketing API эволюционирует). Цели — ODAX/outcome-based: `OUTCOME_SALES`, `OUTCOME_LEADS`,
> `OUTCOME_ENGAGEMENT`, `OUTCOME_TRAFFIC`, `OUTCOME_AWARENESS`, `OUTCOME_APP_PROMOTION`.

### 6.2 adManagementService (оркестратор)

`lib/server/services/adManagementService.ts`:
- `publishFunnel(account, payload)` — валидирует, создаёт campaign → adset → creative → ad
  (все PAUSED), логирует каждый шаг в `ad_operations`, при ошибке откатывает.
- `updateCampaignStatus / updateAdSetStatus / updateAdStatus` (pause/resume/activate)
- `updateBudget(level, id, ...)`
- `deleteObject(level, id)`
- `rollback(createdIds)` — удаляет созданные объекты funnel при частичном сбое.

**«Event»-реклама:** при выборе оптимизации под конверсию adset получает
`optimization_goal=OFFSITE_CONVERSIONS` и `promoted_object={ pixel_id, custom_event_type }`.
Выбранный существующий пост должен вести на сайт с установленным пикселем.

### 6.3 Валидация — Zod

`lib/server/validation/adSchemas.ts`: схемы `CampaignInput`, `AdSetInput` (включая `TargetingInput`),
`AdInput`, `PublishFunnelInput`. Проверяют обязательные поля, бюджеты (минимумы), `special_ad_categories`,
корректность таргетинга и promoted_object.

### 6.4 Маппинг ошибок Meta

`lib/server/services/metaErrorMap.ts`: перевод кодов Meta в понятные сообщения
(нет прав #200/#10, не указана категория рекламы, маленький бюджет, недоступен пиксель и т.д.).

### 6.5 Отчёты и экспорт

- `reportService.ts` — собирает датасет из `metricsService` + иерархии на нужном уровне с разбивками.
- `exporters/csv.ts` — нативная генерация (без зависимостей).
- `exporters/xlsx.ts` — через библиотеку `exceljs` (несколько листов: кампании/группы/объявления + итоги).

---

## 7. API-роуты (pages/api)

- `POST /api/ads/publish` — оркестрованная публикация всего funnel (главный endpoint).
- `PATCH /api/campaigns/[id]`, `PATCH /api/adsets/[id]`, `PATCH /api/ads/[id]` — статус/бюджет.
- `DELETE` на тех же — удаление.
- `GET /api/meta/pages`, `/api/meta/pages/[id]/posts`, `/api/meta/pixels`, `/api/meta/audiences`,
  `/api/meta/targeting/search` — справочники для мастера.
- `GET /api/reports` (превью), `GET /api/reports/export?format=csv|xlsx&...` (скачивание файла).

Все за существующей JWT-аутентификацией + проверкой принадлежности аккаунта пользователю
(паттерн из текущих handlers: `getAccountByIdForMetaUsers`).

---

## 8. Фронтенд

- `pages/ads/new.tsx` — мастер: `CampaignStep` → `AdSetStep` → `AdStep` → `ReviewStep`.
- Компоненты: `TargetingBuilder`, `BudgetSchedule`, `ConversionEvent` (выбор пикселя+события),
  `PostPicker` (выбор существующего поста), `ReviewStep` (сводка + подтверждение).
- Кнопки **Пауза/Возобновить/Бюджет/Удалить** на `pages/campaigns/[id]`, `adsets/[id]`, `ads/[id]`
  (с модальным подтверждением).
- `pages/reports/index.tsx` — фильтры (аккаунт, период, уровень, разбивки) → таблица → экспорт.
- Расширяем `lib/api.ts` (новые функции), `lib/types.ts` (новые типы), `lib/translations.ts` (i18n-строки).

---

## 9. Поток публикации (вариант C)

1. Мастер собирает весь payload на клиенте (campaign + adset + ad).
2. `POST /api/ads/publish` со всем payload.
3. `adManagementService.publishFunnel`:
   1. Zod-валидация.
   2. Создать кампанию (PAUSED) → лог в `ad_operations`.
   3. Создать группу с таргетингом и promoted_object (PAUSED) → лог.
   4. Создать креатив из поста → объявление (PAUSED) → лог.
   5. При сбое — откат созданного, статус `rolled_back`, понятная ошибка с указанием шага.
4. Точечная синхронизация созданных объектов в локальную БД (переиспользуем `syncService`).

---

## 10. Обработка ошибок и безопасность

- PAUSED по умолчанию + подтверждение перед публикацией + явная «Активация».
- Откат при частичном сбое.
- Перевод ошибок Meta в понятный текст.
- Rate-limit уже защищён существующим Bottleneck.

---

## 11. Тестирование

В проекте нет тестов. Добавить лёгкий раннер (`vitest`) и покрыть чистую логику:
- Zod-схемы (валидные/невалидные входы),
- сборку payload таргетинга,
- экспортёры CSV/XLSX,
- маппер ошибок Meta,
- логику отката оркестратора (с замоканным MetaClient).

Запись в реальный Meta — ручное тестирование на реальном аккаунте в статусе PAUSED с минимальными бюджетами
(в Dev Mode приложения, без ожидания App Review).

---

## 12. Версия Graph API

Сейчас `META_GRAPH_VERSION=v19.0` (устаревает). Поднять до актуальной поддерживаемой версии
и проверить наборы полей при реализации.

---

## 13. Что настроить в Meta for Developers (делает владелец приложения)

Без этого запись в рекламу работать не будет:

1. **Тип приложения** Business; добавить продукт **Marketing API**.
2. **Facebook Login for Business**: в Valid OAuth Redirect URIs добавить `META_REDIRECT_URI`.
3. **Business Verification** (Business Manager → Security Center) — обязательно для записи рекламы.
4. **App Review → Advanced Access** на: `ads_management`, `ads_read`, `business_management`,
   `pages_read_engagement`, `pages_show_list`, `instagram_basic` (если посты IG).
   *Самый долгий пункт (дни–недели). В Dev Mode всё работает для админов/разработчиков/тестировщиков
   без ревью — разработка и тесты доступны сразу.*
5. **Meta Pixel** (Events Manager) + доступ рекламного аккаунта к нему (для «event»-рекламы).
6. **Страница Facebook + Instagram** привязаны к рекламному аккаунту/бизнесу (для промо существующих постов).
7. **App ID / App Secret** → в `.env` (секрет — безопасным способом).
8. Приложение добавлено в **Business Portfolio** (Business Settings → Apps).

---

## 14. Вне объёма (на будущее)

- Загрузка нового медиа и сборка креативов с нуля.
- Персистентные черновики (вариант B).
- Запланированные/автоматические отчёты по расписанию.
- PDF-экспорт.
- A/B-тесты, динамические креативы, каталоги.

## 15. Риски

- **App Review / Business Verification** — внешний по отношению к коду, непредсказуемый по срокам.
- Промо существующих постов требует доступа к страницам (pages_*); проверить токен/доступы.
- Marketing API меняется между версиями — фиксировать версию и проверять поля.
- Реальные траты — поэтому PAUSED по умолчанию, подтверждения и аудит обязательны.
