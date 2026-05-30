# Управление рекламой Meta — План B: UI-мастер создания + управление

> **For agentic workers:** реализуется в текущей сессии инлайн. Верификация: юнит-тест чистого
> хелпера `buildPublishPayload` + `npm run build` (типизация). UI рантайм-проверяется после
> настройки `.env` и Meta.

**Goal:** Дать в дашборде мастер создания кампании→группы→объявления (существующие посты,
расширенный таргетинг, оптимизация под конверсии) + кнопки управления (пауза/возобновить/бюджет/удалить).

**Architecture:** Состояние мастера держится на клиенте; финальный submit шлёт один `POST /api/ads/publish`.
Чистый хелпер `buildPublishPayload(state)` переводит состояние мастера в тело API (тестируется юнитом).
Справочники (страницы, посты, пиксели, аудитории, интересы) грузятся через `/api/meta/*`.

**Tech Stack:** React 19, Next.js Pages Router, Tailwind, существующие провайдеры `useLanguage`/`useAccount`.

---

## Структура файлов

**Создаём:**
- `lib/adWizard.ts` — типы состояния, константы (цели, события, плейсменты), `buildPublishPayload`, `defaultWizardState`
- `lib/__tests__/adWizard.test.ts` — тесты хелпера
- `components/ads/CreateAdWizard.tsx` — оркестратор шагов + публикация
- `components/ads/CampaignStep.tsx`, `AdSetStep.tsx`, `AdStep.tsx`, `ReviewStep.tsx`
- `components/ManageActions.tsx` — кнопки пауза/возобновить/бюджет/удалить
- `pages/ads/new.tsx` — страница с layout + авторизацией

**Изменяем:**
- `lib/types.ts` — типы справочников и результата публикации
- `lib/api.ts` — клиентские функции (publish, update/delete, lookups)
- `lib/translations.ts` — ключи `nav.createAd`, `nav.reports`, `ads.*`, `manage.*`, `reports.*` (en+ru)
- `components/Sidebar.tsx` — пункты «Создать рекламу» и «Отчёты»
- `pages/campaigns/[id].tsx`, `pages/adsets/[id].tsx`, `pages/ads/[id].tsx` — встроить `ManageActions`

## Задачи (сжато)

1. i18n-ключи (en+ru), типы, API-клиент.
2. `buildPublishPayload` + тест (конвертация бюджета в центы; promoted_object только при OFFSITE_CONVERSIONS+pixel; интересы→flexible_spec; пропуск пустых полей).
3. Компоненты шагов мастера + страница `pages/ads/new.tsx`.
4. `ManageActions` + встраивание в страницы деталей + ссылки в Sidebar.
5. Верификация: `npm test` (хелпер) + `npm run build`. Коммит.

## Вне объёма
Загрузка медиа (только существующие посты). Полировка UX, графики оценки охвата — позже.
