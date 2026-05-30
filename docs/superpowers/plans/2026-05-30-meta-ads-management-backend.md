# Управление рекламой Meta — План A: бэкенд-фундамент записи

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать бэкенду возможность создавать и изменять кампании/группы/объявления Meta из дашборда — безопасно (PAUSED по умолчанию, аудит, откат), с валидацией и понятными ошибками.

**Architecture:** `MetaClient` расширяется write/lookup-методами (тонкий HTTP-слой). Вся оркестрация и безопасность — в `adManagementService` (создаёт funnel по порядку, пишет в `ad_operations`, откатывает при сбое). Валидация — Zod. Ошибки Meta переводятся в понятный текст. API-роуты Next.js (Pages Router) через существующий `withApi`.

**Tech Stack:** Next.js 16 (Pages Router), TypeScript, Postgres (`pg`), axios + Bottleneck, Zod, Vitest (новый), Meta Marketing API.

---

## Структура файлов

**Создаём:**
- `vitest.config.ts` — конфиг тестов
- `lib/server/services/metaErrors.ts` — `MetaApiError` + `mapMetaError`
- `lib/server/validation/adSchemas.ts` — Zod-схемы входных данных
- `lib/server/services/adOperationsRepo.ts` — запись/обновление аудита
- `lib/server/services/adManagementService.ts` — оркестратор публикации + управление
- `lib/server/db/migrations/007_ad_operations.sql` — аудит-таблица
- `lib/server/api/handlers/adManagementHandlers.ts` — handlers для записи
- `lib/server/api/handlers/metaLookupHandlers.ts` — handlers справочников
- `pages/api/ads/publish.ts`, `pages/api/meta/pages.ts`, `pages/api/meta/pages/[id]/posts.ts`, `pages/api/meta/pixels.ts`, `pages/api/meta/audiences.ts`, `pages/api/meta/targeting/search.ts`
- Тесты: `lib/server/services/__tests__/*.test.ts`, `lib/server/validation/__tests__/*.test.ts`

**Изменяем:**
- `lib/server/services/metaClient.ts` — DI для тестов + write/lookup-методы
- `pages/api/campaigns/[id].ts`, `pages/api/adsets/[id].ts`, `pages/api/ads/[id].ts` — добавить `PATCH`/`DELETE`
- `lib/server/api/handlers/hierarchyHandlers.ts` — добавить update/delete handlers
- `.env.example` — поднять `META_GRAPH_VERSION`

---

## Task 1: Настроить Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Test: `lib/server/services/__tests__/smoke.test.ts`

- [ ] **Step 1: Установить vitest**

Run: `npm install -D vitest@^3`
Expected: добавляется в devDependencies.

- [ ] **Step 2: Создать `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
    globals: true,
  },
});
```

- [ ] **Step 3: Добавить скрипт в `package.json`**

В блок `"scripts"` добавить:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Написать smoke-тест**

`lib/server/services/__tests__/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Запустить тест**

Run: `npm test`
Expected: PASS (1 passed).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/server/services/__tests__/smoke.test.ts
git commit -m "test: настроить vitest"
```

---

## Task 2: Миграция ad_operations

**Files:**
- Create: `lib/server/db/migrations/007_ad_operations.sql`

- [ ] **Step 1: Создать миграцию**

`lib/server/db/migrations/007_ad_operations.sql`:
```sql
CREATE TABLE IF NOT EXISTS ad_operations (
  id              BIGSERIAL PRIMARY KEY,
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  meta_user_id    TEXT NOT NULL,
  operation_type  TEXT NOT NULL,
  level           TEXT,
  meta_object_id  TEXT,
  request_payload JSONB,
  response        JSONB,
  status          TEXT NOT NULL DEFAULT 'pending',
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_operations_account
  ON ad_operations (account_id, created_at DESC);
```

- [ ] **Step 2: Запустить миграции**

Run: `npm run db:migrate`
Expected: применяется 007; в БД появляется таблица `ad_operations`.

- [ ] **Step 3: Commit**

```bash
git add lib/server/db/migrations/007_ad_operations.sql
git commit -m "feat(db): таблица аудита ad_operations"
```

---

## Task 3: Типы ошибок Meta + маппер

**Files:**
- Create: `lib/server/services/metaErrors.ts`
- Test: `lib/server/services/__tests__/metaErrors.test.ts`

- [ ] **Step 1: Написать тест**

`lib/server/services/__tests__/metaErrors.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { MetaApiError, mapMetaError } from '../metaErrors';

describe('mapMetaError', () => {
  it('переводит ошибку прав (#200) в понятный текст', () => {
    const err = new MetaApiError({ code: 200, message: 'Permissions error' });
    expect(mapMetaError(err)).toMatch(/прав/i);
  });

  it('переводит отсутствие special_ad_category (#2635)', () => {
    const err = new MetaApiError({ code: 2635, message: 'x' });
    expect(mapMetaError(err)).toMatch(/категори/i);
  });

  it('для неизвестного кода отдаёт исходное сообщение', () => {
    const err = new MetaApiError({ code: 999999, message: 'Weird thing' });
    expect(mapMetaError(err)).toContain('Weird thing');
  });

  it('обрабатывает не-Meta ошибку', () => {
    expect(mapMetaError(new Error('boom'))).toContain('boom');
  });
});
```

- [ ] **Step 2: Запустить тест — должен упасть**

Run: `npm test -- metaErrors`
Expected: FAIL (модуль не найден).

- [ ] **Step 3: Реализовать**

`lib/server/services/metaErrors.ts`:
```ts
export interface MetaErrorBody {
  code?: number;
  error_subcode?: number;
  message?: string;
  error_user_title?: string;
  error_user_msg?: string;
}

export class MetaApiError extends Error {
  readonly code?: number;
  readonly subcode?: number;
  readonly userMsg?: string;

  constructor(body: MetaErrorBody | undefined, cause?: unknown) {
    super(body?.message || 'Meta API error');
    this.name = 'MetaApiError';
    this.code = body?.code;
    this.subcode = body?.error_subcode;
    this.userMsg = body?.error_user_msg;
    if (cause) (this as { cause?: unknown }).cause = cause;
  }
}

const CODE_MESSAGES: Record<number, string> = {
  200: 'Недостаточно прав. Проверьте разрешение ads_management и доступ к рекламному аккаунту.',
  10: 'Недостаточно прав для этого действия.',
  2635: 'Не указана категория рекламы (special ad category). Укажите её на шаге кампании.',
  100: 'Некорректные параметры запроса. Проверьте заполненные поля.',
  1487006: 'Слишком маленький бюджет для выбранной оптимизации.',
  2490: 'Выбранный пиксель недоступен для этого рекламного аккаунта.',
};

export function mapMetaError(error: unknown): string {
  if (error instanceof MetaApiError) {
    if (error.userMsg) return error.userMsg;
    if (error.code && CODE_MESSAGES[error.code]) return CODE_MESSAGES[error.code];
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Неизвестная ошибка при обращении к Meta.';
}
```

- [ ] **Step 4: Запустить тест — должен пройти**

Run: `npm test -- metaErrors`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add lib/server/services/metaErrors.ts lib/server/services/__tests__/metaErrors.test.ts
git commit -m "feat: типы и маппер ошибок Meta"
```

---

## Task 4: MetaClient — тестируемость, write-хелпер, версия Graph

**Files:**
- Modify: `lib/server/services/metaClient.ts`
- Modify: `.env.example`
- Test: `lib/server/services/__tests__/metaClient.write.test.ts`

- [ ] **Step 1: Написать тест на write-хелпер через createCampaign (заглушка метода появится в Task 5 — тест пишем на инфраструктуру POST)**

`lib/server/services/__tests__/metaClient.write.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import type { AxiosInstance } from 'axios';
import { MetaClient } from '../metaClient';

function fakeHttp(postImpl: unknown): AxiosInstance {
  return { post: vi.fn(postImpl), delete: vi.fn(), get: vi.fn() } as unknown as AxiosInstance;
}

describe('MetaClient write', () => {
  it('createCampaign шлёт POST на /act_<id>/campaigns с access_token', async () => {
    const post = vi.fn().mockResolvedValue({ data: { id: '123' }, headers: {} });
    const client = new MetaClient({ post, delete: vi.fn(), get: vi.fn() } as unknown as AxiosInstance);
    const res = await client.createCampaign('act_999', 'TOKEN', { name: 'C', objective: 'OUTCOME_TRAFFIC', status: 'PAUSED', special_ad_categories: [] });
    expect(res.id).toBe('123');
    const [endpoint, , config] = post.mock.calls[0];
    expect(endpoint).toBe('/act_999/campaigns');
    expect(config.params.access_token).toBe('TOKEN');
    expect(config.params.name).toBe('C');
  });
});
```

- [ ] **Step 2: Запустить — упадёт (нет конструктора с DI / нет createCampaign)**

Run: `npm test -- metaClient.write`
Expected: FAIL.

- [ ] **Step 3: Добавить DI в конструктор**

В `lib/server/services/metaClient.ts` заменить конструктор:
```ts
  constructor(httpClient?: AxiosInstance) {
    this.http = httpClient ?? axios.create({
      baseURL: `https://graph.facebook.com/${env.META_GRAPH_VERSION}`,
      timeout: 30_000,
    });
  }
```

- [ ] **Step 4: Добавить write-хелпер**

Добавить в класс `MetaClient` (рядом с `getWithHeaders`), не забыв импорт `MetaApiError`:
```ts
  private async writeRequest<T>(
    method: 'post' | 'delete',
    endpoint: string,
    accessToken: string,
    data: Record<string, unknown>,
    adAccountId: string,
    maxRetries = 2,
  ): Promise<T> {
    const limiter = this.getLimiterForAccount(adAccountId);
    const execute = async (): Promise<T> => {
      let attempt = 0;
      while (attempt <= maxRetries) {
        try {
          const params = { ...data, access_token: accessToken };
          const response =
            method === 'post'
              ? await this.http.post<T>(endpoint, null, { params })
              : await this.http.delete<T>(endpoint, { params });
          const info = parseRateLimitHeader(response.headers as Record<string, unknown>);
          if (info) {
            this.rateLimitState.set(adAccountId, info);
            this.adjustLimiterSpeed(limiter, info);
          }
          return response.data;
        } catch (error) {
          const axiosError = error as AxiosError;
          const canRetry = isRetryableMetaError(axiosError) && attempt < maxRetries;
          if (!canRetry) {
            const body = (axiosError.response?.data as { error?: import('./metaErrors').MetaErrorBody })?.error;
            throw new MetaApiError(body, axiosError);
          }
          await new Promise((r) => setTimeout(r, 600 * 2 ** attempt));
          attempt += 1;
        }
      }
      throw new MetaApiError({ message: 'Meta API write failed after retries' });
    };
    return limiter.schedule(execute);
  }
```
Добавить импорт сверху файла:
```ts
import { MetaApiError } from './metaErrors';
```

- [ ] **Step 5: Добавить createCampaign (минимально, чтобы тест Task 4 прошёл; остальные write-методы — Task 5)**

```ts
  async createCampaign(
    adAccountId: string,
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<{ id: string }> {
    const id = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    return this.writeRequest<{ id: string }>('post', `/${id}/campaigns`, accessToken, payload, id);
  }
```

- [ ] **Step 6: Запустить — пройдёт**

Run: `npm test -- metaClient.write`
Expected: PASS.

- [ ] **Step 7: Поднять версию Graph в `.env.example`**

Заменить `META_GRAPH_VERSION=v19.0` на актуальную поддерживаемую версию (проверить в Meta App Dashboard, например `v23.0`). Добавить комментарий:
```
# Использовать актуальную версию Graph API (см. Meta App Dashboard)
META_GRAPH_VERSION=v23.0
```

- [ ] **Step 8: Commit**

```bash
git add lib/server/services/metaClient.ts lib/server/services/__tests__/metaClient.write.test.ts .env.example
git commit -m "feat(meta): DI + write-хелпер + актуальная версия Graph"
```

---

## Task 5: MetaClient — остальные write-методы

**Files:**
- Modify: `lib/server/services/metaClient.ts`
- Test: `lib/server/services/__tests__/metaClient.write.test.ts` (дополнить)

- [ ] **Step 1: Дописать тесты**

Добавить в `metaClient.write.test.ts`:
```ts
it('createAdSet шлёт POST на /act_<id>/adsets', async () => {
  const post = vi.fn().mockResolvedValue({ data: { id: 'as1' }, headers: {} });
  const client = new MetaClient({ post, delete: vi.fn(), get: vi.fn() } as unknown as AxiosInstance);
  const res = await client.createAdSet('act_1', 'T', { name: 'AS', campaign_id: 'c1' });
  expect(res.id).toBe('as1');
  expect(post.mock.calls[0][0]).toBe('/act_1/adsets');
});

it('createAdCreativeFromPost шлёт POST на /act_<id>/adcreatives', async () => {
  const post = vi.fn().mockResolvedValue({ data: { id: 'cr1' }, headers: {} });
  const client = new MetaClient({ post, delete: vi.fn(), get: vi.fn() } as unknown as AxiosInstance);
  const res = await client.createAdCreativeFromPost('act_1', 'T', { name: 'cr', object_story_id: '111_222' });
  expect(res.id).toBe('cr1');
  expect(post.mock.calls[0][0]).toBe('/act_1/adcreatives');
});

it('createAd шлёт POST на /act_<id>/ads', async () => {
  const post = vi.fn().mockResolvedValue({ data: { id: 'ad1' }, headers: {} });
  const client = new MetaClient({ post, delete: vi.fn(), get: vi.fn() } as unknown as AxiosInstance);
  const res = await client.createAd('act_1', 'T', { name: 'ad', adset_id: 'as1', creative_id: 'cr1' });
  expect(res.id).toBe('ad1');
  expect(post.mock.calls[0][0]).toBe('/act_1/ads');
});

it('updateObject шлёт POST на /<id>', async () => {
  const post = vi.fn().mockResolvedValue({ data: { success: true }, headers: {} });
  const client = new MetaClient({ post, delete: vi.fn(), get: vi.fn() } as unknown as AxiosInstance);
  await client.updateObject('c1', 'T', 'act_1', { status: 'PAUSED' });
  expect(post.mock.calls[0][0]).toBe('/c1');
});

it('deleteObject шлёт DELETE на /<id>', async () => {
  const del = vi.fn().mockResolvedValue({ data: { success: true }, headers: {} });
  const client = new MetaClient({ post: vi.fn(), delete: del, get: vi.fn() } as unknown as AxiosInstance);
  await client.deleteObject('c1', 'T', 'act_1');
  expect(del.mock.calls[0][0]).toBe('/c1');
});
```

- [ ] **Step 2: Запустить — новые тесты упадут**

Run: `npm test -- metaClient.write`
Expected: FAIL (методы отсутствуют).

- [ ] **Step 3: Реализовать методы**

Добавить в `MetaClient`:
```ts
  async createAdSet(adAccountId: string, accessToken: string, payload: Record<string, unknown>): Promise<{ id: string }> {
    const id = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    return this.writeRequest('post', `/${id}/adsets`, accessToken, payload, id);
  }

  async createAdCreativeFromPost(adAccountId: string, accessToken: string, payload: { name: string; object_story_id: string }): Promise<{ id: string }> {
    const id = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    return this.writeRequest('post', `/${id}/adcreatives`, accessToken, payload as Record<string, unknown>, id);
  }

  async createAd(adAccountId: string, accessToken: string, payload: Record<string, unknown>): Promise<{ id: string }> {
    const id = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    return this.writeRequest('post', `/${id}/ads`, accessToken, payload, id);
  }

  async updateObject(objectId: string, accessToken: string, adAccountId: string, fields: Record<string, unknown>): Promise<{ success?: boolean }> {
    const id = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    return this.writeRequest('post', `/${objectId}`, accessToken, fields, id);
  }

  async deleteObject(objectId: string, accessToken: string, adAccountId: string): Promise<{ success?: boolean }> {
    const id = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    return this.writeRequest('delete', `/${objectId}`, accessToken, {}, id);
  }
```

> Примечание для исполнителя: вложенные объекты (`targeting`, `promoted_object`, `special_ad_categories`) Meta ожидает строкой JSON в параметрах. Сериализацию делает сервис (Task 9), не клиент.

- [ ] **Step 4: Запустить — пройдут**

Run: `npm test -- metaClient.write`
Expected: PASS (все).

- [ ] **Step 5: Commit**

```bash
git add lib/server/services/metaClient.ts lib/server/services/__tests__/metaClient.write.test.ts
git commit -m "feat(meta): write-методы create/update/delete"
```

---

## Task 6: MetaClient — lookup-методы (справочники)

**Files:**
- Modify: `lib/server/services/metaClient.ts`
- Test: `lib/server/services/__tests__/metaClient.lookup.test.ts`

- [ ] **Step 1: Написать тест**

`lib/server/services/__tests__/metaClient.lookup.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import type { AxiosInstance } from 'axios';
import { MetaClient } from '../metaClient';

function clientWithGet(getImpl: unknown) {
  return new MetaClient({ get: vi.fn(getImpl), post: vi.fn(), delete: vi.fn() } as unknown as AxiosInstance);
}

describe('MetaClient lookup', () => {
  it('getAdPixels читает /act_<id>/adspixels', async () => {
    const get = vi.fn().mockResolvedValue({ data: { data: [{ id: 'p1', name: 'Pixel' }] }, headers: {} });
    const client = clientWithGet(get);
    const res = await client.getAdPixels('act_1', 'T');
    expect(res.data[0].id).toBe('p1');
    expect(get.mock.calls[0][0]).toBe('/act_1/adspixels');
  });

  it('searchInterests читает /search?type=adinterest', async () => {
    const get = vi.fn().mockResolvedValue({ data: { data: [{ id: 'i1', name: 'Cats' }] }, headers: {} });
    const client = clientWithGet(get);
    const res = await client.searchInterests('T', 'cats');
    expect(res.data[0].name).toBe('Cats');
    expect(get.mock.calls[0][0]).toBe('/search');
    expect(get.mock.calls[0][1].params.type).toBe('adinterest');
  });
});
```

- [ ] **Step 2: Запустить — упадёт**

Run: `npm test -- metaClient.lookup`
Expected: FAIL.

- [ ] **Step 3: Реализовать lookup-методы**

Добавить в `MetaClient` (используют существующий приватный `get` для глобальных и `getWithHeaders` для аккаунтных; для простоты тестов читаем напрямую через `this.http.get`):
```ts
  async getPages(accessToken: string): Promise<{ data: Array<{ id: string; name: string; access_token?: string }> }> {
    const { data } = await this.http.get('/me/accounts', { params: { fields: 'id,name,access_token', limit: 200, access_token: accessToken } });
    return data;
  }

  async getPromotablePosts(pageId: string, accessToken: string): Promise<{ data: Array<{ id: string; message?: string; created_time?: string }> }> {
    const { data } = await this.http.get(`/${pageId}/ads_posts`, { params: { fields: 'id,message,created_time', limit: 100, access_token: accessToken } });
    return data;
  }

  async getAdPixels(adAccountId: string, accessToken: string): Promise<{ data: Array<{ id: string; name: string }> }> {
    const id = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    const { data } = await this.http.get(`/${id}/adspixels`, { params: { fields: 'id,name', access_token: accessToken } });
    return data;
  }

  async getCustomAudiences(adAccountId: string, accessToken: string): Promise<{ data: Array<{ id: string; name: string; subtype?: string; approximate_count?: number }> }> {
    const id = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    const { data } = await this.http.get(`/${id}/customaudiences`, { params: { fields: 'id,name,subtype,approximate_count', limit: 200, access_token: accessToken } });
    return data;
  }

  async getSavedAudiences(adAccountId: string, accessToken: string): Promise<{ data: Array<{ id: string; name: string }> }> {
    const id = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    const { data } = await this.http.get(`/${id}/saved_audiences`, { params: { fields: 'id,name', limit: 200, access_token: accessToken } });
    return data;
  }

  async searchInterests(accessToken: string, q: string): Promise<{ data: Array<{ id: string; name: string; audience_size_lower_bound?: number }> }> {
    const { data } = await this.http.get('/search', { params: { type: 'adinterest', q, limit: 25, access_token: accessToken } });
    return data;
  }

  async searchGeo(accessToken: string, q: string): Promise<{ data: Array<{ key: string; name: string; type: string }> }> {
    const { data } = await this.http.get('/search', { params: { type: 'adgeolocation', q, location_types: JSON.stringify(['country', 'region', 'city']), access_token: accessToken } });
    return data;
  }

  async getDeliveryEstimate(adAccountId: string, accessToken: string, targeting: Record<string, unknown>, optimizationGoal: string): Promise<{ data: unknown[] }> {
    const id = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    const { data } = await this.http.get(`/${id}/delivery_estimate`, { params: { targeting_spec: JSON.stringify(targeting), optimization_goal: optimizationGoal, access_token: accessToken } });
    return data;
  }
```

- [ ] **Step 4: Запустить — пройдёт**

Run: `npm test -- metaClient.lookup`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/server/services/metaClient.ts lib/server/services/__tests__/metaClient.lookup.test.ts
git commit -m "feat(meta): lookup-методы справочников"
```

---

## Task 7: Zod-схемы входных данных

**Files:**
- Create: `lib/server/validation/adSchemas.ts`
- Test: `lib/server/validation/__tests__/adSchemas.test.ts`

- [ ] **Step 1: Написать тест**

`lib/server/validation/__tests__/adSchemas.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { PublishFunnelSchema } from '../adSchemas';

const valid = {
  campaign: { name: 'C', objective: 'OUTCOME_SALES', special_ad_categories: [] },
  adSet: {
    name: 'AS',
    daily_budget: 500,
    optimization_goal: 'OFFSITE_CONVERSIONS',
    billing_event: 'IMPRESSIONS',
    targeting: { geo_locations: { countries: ['US'] }, age_min: 18, age_max: 65 },
    promoted_object: { pixel_id: 'px1', custom_event_type: 'PURCHASE' },
  },
  ad: { name: 'AD', object_story_id: '111_222' },
};

describe('PublishFunnelSchema', () => {
  it('принимает валидный funnel', () => {
    expect(PublishFunnelSchema.safeParse(valid).success).toBe(true);
  });

  it('требует countries в гео', () => {
    const bad = { ...valid, adSet: { ...valid.adSet, targeting: { geo_locations: { countries: [] }, age_min: 18, age_max: 65 } } };
    expect(PublishFunnelSchema.safeParse(bad).success).toBe(false);
  });

  it('требует положительный бюджет', () => {
    const bad = { ...valid, adSet: { ...valid.adSet, daily_budget: 0 } };
    expect(PublishFunnelSchema.safeParse(bad).success).toBe(false);
  });

  it('требует pixel_id при OFFSITE_CONVERSIONS', () => {
    const bad = { ...valid, adSet: { ...valid.adSet, promoted_object: undefined } };
    expect(PublishFunnelSchema.safeParse(bad).success).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить — упадёт**

Run: `npm test -- adSchemas`
Expected: FAIL.

- [ ] **Step 3: Реализовать схемы**

`lib/server/validation/adSchemas.ts`:
```ts
import { z } from 'zod';

export const TargetingSchema = z.object({
  geo_locations: z.object({
    countries: z.array(z.string()).min(1, 'Укажите хотя бы одну страну'),
    regions: z.array(z.object({ key: z.string() })).optional(),
    cities: z.array(z.object({ key: z.string(), radius: z.number().optional(), distance_unit: z.string().optional() })).optional(),
  }),
  age_min: z.number().int().min(13).max(65),
  age_max: z.number().int().min(13).max(65),
  genders: z.array(z.union([z.literal(1), z.literal(2)])).optional(),
  locales: z.array(z.number()).optional(),
  flexible_spec: z.array(z.object({
    interests: z.array(z.object({ id: z.string(), name: z.string().optional() })).optional(),
    behaviors: z.array(z.object({ id: z.string(), name: z.string().optional() })).optional(),
  })).optional(),
  exclusions: z.object({
    interests: z.array(z.object({ id: z.string() })).optional(),
  }).optional(),
  custom_audiences: z.array(z.object({ id: z.string() })).optional(),
  excluded_custom_audiences: z.array(z.object({ id: z.string() })).optional(),
  publisher_platforms: z.array(z.string()).optional(),
  facebook_positions: z.array(z.string()).optional(),
  instagram_positions: z.array(z.string()).optional(),
});

export const CampaignSchema = z.object({
  name: z.string().min(1),
  objective: z.enum([
    'OUTCOME_SALES', 'OUTCOME_LEADS', 'OUTCOME_ENGAGEMENT',
    'OUTCOME_TRAFFIC', 'OUTCOME_AWARENESS', 'OUTCOME_APP_PROMOTION',
  ]),
  special_ad_categories: z.array(z.string()),
  daily_budget: z.number().int().positive().optional(),
  lifetime_budget: z.number().int().positive().optional(),
  bid_strategy: z.string().optional(),
});

export const PromotedObjectSchema = z.object({
  pixel_id: z.string(),
  custom_event_type: z.string(),
});

export const AdSetSchema = z.object({
  name: z.string().min(1),
  daily_budget: z.number().int().positive().optional(),
  lifetime_budget: z.number().int().positive().optional(),
  optimization_goal: z.string().min(1),
  billing_event: z.string().min(1),
  bid_amount: z.number().int().positive().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  targeting: TargetingSchema,
  promoted_object: PromotedObjectSchema.optional(),
})
  .refine((s) => s.daily_budget || s.lifetime_budget, { message: 'Укажите дневной или общий бюджет' })
  .refine((s) => s.optimization_goal !== 'OFFSITE_CONVERSIONS' || !!s.promoted_object, {
    message: 'Для оптимизации под конверсии нужен пиксель и событие',
    path: ['promoted_object'],
  });

export const AdSchema = z.object({
  name: z.string().min(1),
  object_story_id: z.string().min(1),
});

export const PublishFunnelSchema = z.object({
  campaign: CampaignSchema,
  adSet: AdSetSchema,
  ad: AdSchema,
});

export type PublishFunnelInput = z.infer<typeof PublishFunnelSchema>;
```

- [ ] **Step 4: Запустить — пройдёт**

Run: `npm test -- adSchemas`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add lib/server/validation/adSchemas.ts lib/server/validation/__tests__/adSchemas.test.ts
git commit -m "feat: Zod-схемы валидации funnel"
```

---

## Task 8: Репозиторий ad_operations

**Files:**
- Create: `lib/server/services/adOperationsRepo.ts`
- Test: `lib/server/services/__tests__/adOperationsRepo.test.ts`

- [ ] **Step 1: Написать тест (мокаем `query`)**

`lib/server/services/__tests__/adOperationsRepo.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryMock = vi.fn();
vi.mock('../../config/db', () => ({ query: (...args: unknown[]) => queryMock(...args) }));

import { recordOperation, markOperation } from '../adOperationsRepo';

beforeEach(() => queryMock.mockReset());

describe('adOperationsRepo', () => {
  it('recordOperation вставляет строку и возвращает id', async () => {
    queryMock.mockResolvedValue([{ id: '7' }]);
    const id = await recordOperation({ accountId: 'a', metaUserId: 'u', operationType: 'create_campaign', level: 'campaign', requestPayload: { name: 'C' } });
    expect(id).toBe('7');
    expect(queryMock.mock.calls[0][0]).toMatch(/INSERT INTO ad_operations/);
  });

  it('markOperation обновляет статус', async () => {
    queryMock.mockResolvedValue([]);
    await markOperation('7', { status: 'success', metaObjectId: 'c1' });
    expect(queryMock.mock.calls[0][0]).toMatch(/UPDATE ad_operations/);
  });
});
```

- [ ] **Step 2: Запустить — упадёт**

Run: `npm test -- adOperationsRepo`
Expected: FAIL.

- [ ] **Step 3: Реализовать**

`lib/server/services/adOperationsRepo.ts`:
```ts
import { query } from '../config/db';

export interface RecordOperationInput {
  accountId: string;
  metaUserId: string;
  operationType: string;
  level?: string;
  requestPayload?: unknown;
}

export async function recordOperation(input: RecordOperationInput): Promise<string> {
  const rows = await query<{ id: string }>(
    `INSERT INTO ad_operations (account_id, meta_user_id, operation_type, level, request_payload, status)
     VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING id`,
    [input.accountId, input.metaUserId, input.operationType, input.level ?? null, JSON.stringify(input.requestPayload ?? null)],
  );
  return rows[0].id;
}

export interface MarkOperationInput {
  status: 'success' | 'failed' | 'rolled_back';
  metaObjectId?: string;
  response?: unknown;
  errorMessage?: string;
}

export async function markOperation(id: string, input: MarkOperationInput): Promise<void> {
  await query(
    `UPDATE ad_operations
     SET status = $2, meta_object_id = COALESCE($3, meta_object_id),
         response = COALESCE($4, response), error_message = COALESCE($5, error_message)
     WHERE id = $1`,
    [id, input.status, input.metaObjectId ?? null, input.response ? JSON.stringify(input.response) : null, input.errorMessage ?? null],
  );
}
```

- [ ] **Step 4: Запустить — пройдёт**

Run: `npm test -- adOperationsRepo`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/server/services/adOperationsRepo.ts lib/server/services/__tests__/adOperationsRepo.test.ts
git commit -m "feat: репозиторий аудита ad_operations"
```

---

## Task 9: adManagementService — publishFunnel + откат

**Files:**
- Create: `lib/server/services/adManagementService.ts`
- Test: `lib/server/services/__tests__/adManagementService.test.ts`

- [ ] **Step 1: Написать тест (успех и откат, с фейковым клиентом)**

`lib/server/services/__tests__/adManagementService.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { publishFunnel } from '../adManagementService';
import type { PublishFunnelInput } from '../../validation/adSchemas';

const input: PublishFunnelInput = {
  campaign: { name: 'C', objective: 'OUTCOME_SALES', special_ad_categories: [] },
  adSet: {
    name: 'AS', daily_budget: 500, optimization_goal: 'OFFSITE_CONVERSIONS', billing_event: 'IMPRESSIONS',
    targeting: { geo_locations: { countries: ['US'] }, age_min: 18, age_max: 65 },
    promoted_object: { pixel_id: 'px1', custom_event_type: 'PURCHASE' },
  },
  ad: { name: 'AD', object_story_id: '111_222' },
};

const account = { id: 'acc', owner_meta_user_id: 'u', ad_account_id: 'act_1', user_access_token: 'T' } as never;

function fakeDeps(overrides = {}) {
  return {
    client: {
      createCampaign: vi.fn().mockResolvedValue({ id: 'c1' }),
      createAdSet: vi.fn().mockResolvedValue({ id: 'as1' }),
      createAdCreativeFromPost: vi.fn().mockResolvedValue({ id: 'cr1' }),
      createAd: vi.fn().mockResolvedValue({ id: 'ad1' }),
      deleteObject: vi.fn().mockResolvedValue({ success: true }),
    },
    recordOperation: vi.fn().mockResolvedValue('op'),
    markOperation: vi.fn().mockResolvedValue(undefined),
    syncAccount: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('publishFunnel', () => {
  it('создаёт campaign→adset→creative→ad в статусе PAUSED', async () => {
    const deps = fakeDeps();
    const res = await publishFunnel(account, input, deps as never);
    expect(res).toEqual({ campaignId: 'c1', adSetId: 'as1', adId: 'ad1' });
    expect(deps.client.createCampaign.mock.calls[0][2].status).toBe('PAUSED');
    expect(deps.client.createAdSet.mock.calls[0][2].status).toBe('PAUSED');
  });

  it('сериализует targeting и promoted_object в JSON-строку', async () => {
    const deps = fakeDeps();
    await publishFunnel(account, input, deps as never);
    const adsetPayload = deps.client.createAdSet.mock.calls[0][2];
    expect(typeof adsetPayload.targeting).toBe('string');
    expect(typeof adsetPayload.promoted_object).toBe('string');
  });

  it('откатывает кампанию, если падает создание группы', async () => {
    const deps = fakeDeps({
      client: {
        createCampaign: vi.fn().mockResolvedValue({ id: 'c1' }),
        createAdSet: vi.fn().mockRejectedValue(new Error('adset failed')),
        createAdCreativeFromPost: vi.fn(),
        createAd: vi.fn(),
        deleteObject: vi.fn().mockResolvedValue({ success: true }),
      },
    });
    await expect(publishFunnel(account, input, deps as never)).rejects.toThrow();
    expect(deps.client.deleteObject).toHaveBeenCalledWith('c1', 'T', 'act_1');
  });
});
```

- [ ] **Step 2: Запустить — упадёт**

Run: `npm test -- adManagementService`
Expected: FAIL.

- [ ] **Step 3: Реализовать сервис**

`lib/server/services/adManagementService.ts`:
```ts
import type { AccountRecord } from './accountService';
import type { PublishFunnelInput } from '../validation/adSchemas';
import { metaClient } from './metaClient';
import { recordOperation, markOperation } from './adOperationsRepo';
import { syncAccount } from './syncService';
import { mapMetaError } from './metaErrors';
import { createHttpError } from '../api/http';

export interface PublishDeps {
  client: Pick<typeof metaClient, 'createCampaign' | 'createAdSet' | 'createAdCreativeFromPost' | 'createAd' | 'deleteObject'>;
  recordOperation: typeof recordOperation;
  markOperation: typeof markOperation;
  syncAccount: typeof syncAccount;
}

const defaultDeps: PublishDeps = { client: metaClient, recordOperation, markOperation, syncAccount };

export interface PublishResult {
  campaignId: string;
  adSetId: string;
  adId: string;
}

export async function publishFunnel(
  account: AccountRecord,
  input: PublishFunnelInput,
  deps: PublishDeps = defaultDeps,
): Promise<PublishResult> {
  const adAccountId = account.ad_account_id;
  const token = account.user_access_token;
  if (!adAccountId || !token) throw createHttpError(400, 'У аккаунта нет ad_account_id или токена.');

  const created: { campaignId?: string; adSetId?: string } = {};

  const run = async <T>(type: string, level: string, payload: unknown, fn: () => Promise<T>): Promise<T> => {
    const opId = await deps.recordOperation({ accountId: account.id, metaUserId: account.owner_meta_user_id, operationType: type, level, requestPayload: payload });
    try {
      const result = await fn();
      await deps.markOperation(opId, { status: 'success', metaObjectId: (result as { id?: string }).id, response: result });
      return result;
    } catch (error) {
      await deps.markOperation(opId, { status: 'failed', errorMessage: mapMetaError(error) });
      throw error;
    }
  };

  try {
    const campaign = await run('create_campaign', 'campaign', input.campaign, () =>
      deps.client.createCampaign(adAccountId, token, { ...input.campaign, status: 'PAUSED', special_ad_categories: JSON.stringify(input.campaign.special_ad_categories) }),
    );
    created.campaignId = campaign.id;

    const adSet = await run('create_adset', 'adset', input.adSet, () =>
      deps.client.createAdSet(adAccountId, token, {
        ...input.adSet,
        campaign_id: campaign.id,
        status: 'PAUSED',
        targeting: JSON.stringify(input.adSet.targeting),
        ...(input.adSet.promoted_object ? { promoted_object: JSON.stringify(input.adSet.promoted_object) } : {}),
      }),
    );
    created.adSetId = adSet.id;

    const creative = await run('create_creative', 'ad', { object_story_id: input.ad.object_story_id }, () =>
      deps.client.createAdCreativeFromPost(adAccountId, token, { name: `${input.ad.name} creative`, object_story_id: input.ad.object_story_id }),
    );

    const ad = await run('create_ad', 'ad', input.ad, () =>
      deps.client.createAd(adAccountId, token, { name: input.ad.name, adset_id: adSet.id, creative_id: creative.id, status: 'PAUSED' }),
    );

    await deps.syncAccount(account).catch(() => undefined);
    return { campaignId: campaign.id, adSetId: adSet.id, adId: ad.id };
  } catch (error) {
    // Откат: удаляем созданное в обратном порядке
    if (created.adSetId) await deps.client.deleteObject(created.adSetId, token, adAccountId).catch(() => undefined);
    if (created.campaignId) await deps.client.deleteObject(created.campaignId, token, adAccountId).catch(() => undefined);
    throw createHttpError(502, `Публикация не удалась, изменения откатаны: ${mapMetaError(error)}`);
  }
}
```

- [ ] **Step 4: Запустить — пройдёт**

Run: `npm test -- adManagementService`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add lib/server/services/adManagementService.ts lib/server/services/__tests__/adManagementService.test.ts
git commit -m "feat: оркестратор publishFunnel с откатом"
```

---

## Task 10: adManagementService — управление (статус/бюджет/удаление)

**Files:**
- Modify: `lib/server/services/adManagementService.ts`
- Test: `lib/server/services/__tests__/adManagementService.manage.test.ts`

- [ ] **Step 1: Написать тест**

`lib/server/services/__tests__/adManagementService.manage.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { updateObjectStatus, updateObjectBudget, deleteAdObject } from '../adManagementService';

const account = { id: 'acc', owner_meta_user_id: 'u', ad_account_id: 'act_1', user_access_token: 'T' } as never;

function deps() {
  return {
    client: { updateObject: vi.fn().mockResolvedValue({ success: true }), deleteObject: vi.fn().mockResolvedValue({ success: true }) },
    recordOperation: vi.fn().mockResolvedValue('op'),
    markOperation: vi.fn().mockResolvedValue(undefined),
  };
}

describe('management ops', () => {
  it('updateObjectStatus шлёт статус', async () => {
    const d = deps();
    await updateObjectStatus(account, 'campaign', 'c1', 'PAUSED', d as never);
    expect(d.client.updateObject).toHaveBeenCalledWith('c1', 'T', 'act_1', { status: 'PAUSED' });
  });

  it('updateObjectBudget шлёт daily_budget', async () => {
    const d = deps();
    await updateObjectBudget(account, 'adset', 'as1', { daily_budget: 1000 }, d as never);
    expect(d.client.updateObject).toHaveBeenCalledWith('as1', 'T', 'act_1', { daily_budget: 1000 });
  });

  it('deleteAdObject удаляет', async () => {
    const d = deps();
    await deleteAdObject(account, 'ad', 'ad1', d as never);
    expect(d.client.deleteObject).toHaveBeenCalledWith('ad1', 'T', 'act_1');
  });
});
```

- [ ] **Step 2: Запустить — упадёт**

Run: `npm test -- adManagementService.manage`
Expected: FAIL.

- [ ] **Step 3: Реализовать (добавить в `adManagementService.ts`)**

```ts
export interface ManageDeps {
  client: Pick<typeof metaClient, 'updateObject' | 'deleteObject'>;
  recordOperation: typeof recordOperation;
  markOperation: typeof markOperation;
}
const defaultManageDeps: ManageDeps = { client: metaClient, recordOperation, markOperation };

type Level = 'campaign' | 'adset' | 'ad';

async function withAudit(account: AccountRecord, type: string, level: Level, objectId: string, payload: unknown, deps: ManageDeps, fn: () => Promise<unknown>) {
  const adAccountId = account.ad_account_id;
  const token = account.user_access_token;
  if (!adAccountId || !token) throw createHttpError(400, 'У аккаунта нет ad_account_id или токена.');
  const opId = await deps.recordOperation({ accountId: account.id, metaUserId: account.owner_meta_user_id, operationType: type, level, requestPayload: payload });
  try {
    const res = await fn();
    await deps.markOperation(opId, { status: 'success', metaObjectId: objectId, response: res });
    return res;
  } catch (error) {
    await deps.markOperation(opId, { status: 'failed', errorMessage: mapMetaError(error) });
    throw createHttpError(502, mapMetaError(error));
  }
}

export async function updateObjectStatus(account: AccountRecord, level: Level, objectId: string, status: 'ACTIVE' | 'PAUSED' | 'DELETED', deps: ManageDeps = defaultManageDeps) {
  return withAudit(account, 'update_status', level, objectId, { status }, deps, () =>
    deps.client.updateObject(objectId, account.user_access_token as string, account.ad_account_id as string, { status }));
}

export async function updateObjectBudget(account: AccountRecord, level: Level, objectId: string, budget: { daily_budget?: number; lifetime_budget?: number }, deps: ManageDeps = defaultManageDeps) {
  return withAudit(account, 'update_budget', level, objectId, budget, deps, () =>
    deps.client.updateObject(objectId, account.user_access_token as string, account.ad_account_id as string, budget));
}

export async function deleteAdObject(account: AccountRecord, level: Level, objectId: string, deps: ManageDeps = defaultManageDeps) {
  return withAudit(account, 'delete', level, objectId, {}, deps, () =>
    deps.client.deleteObject(objectId, account.user_access_token as string, account.ad_account_id as string));
}
```

- [ ] **Step 4: Запустить — пройдёт**

Run: `npm test -- adManagementService.manage`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add lib/server/services/adManagementService.ts lib/server/services/__tests__/adManagementService.manage.test.ts
git commit -m "feat: управление статусом/бюджетом/удалением"
```

---

## Task 11: API — POST /api/ads/publish

**Files:**
- Create: `lib/server/api/handlers/adManagementHandlers.ts`
- Create: `pages/api/ads/publish.ts`
- Test: `lib/server/api/handlers/__tests__/adManagementHandlers.test.ts`

- [ ] **Step 1: Написать тест на handler (мок сервиса и аккаунта)**

`lib/server/api/handlers/__tests__/adManagementHandlers.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getAccount = vi.fn();
const publish = vi.fn();
vi.mock('../../../services/accountService', () => ({ getAccountByIdForMetaUsers: (...a: unknown[]) => getAccount(...a) }));
vi.mock('../../../services/adManagementService', () => ({ publishFunnel: (...a: unknown[]) => publish(...a) }));

import { publishHandler } from '../adManagementHandlers';

function mockRes() {
  const res = { statusCode: 0, body: undefined as unknown, status(c: number) { this.statusCode = c; return this; }, json(b: unknown) { this.body = b; return this; } };
  return res;
}

beforeEach(() => { getAccount.mockReset(); publish.mockReset(); });

describe('publishHandler', () => {
  it('400 без account_id', async () => {
    const req = { user: { metaUserIds: ['u'] }, query: {}, body: {} } as never;
    const res = mockRes();
    await expect(publishHandler(req, res as never)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('публикует валидный funnel и возвращает id', async () => {
    getAccount.mockResolvedValue({ id: 'acc', ad_account_id: 'act_1', user_access_token: 'T', owner_meta_user_id: 'u' });
    publish.mockResolvedValue({ campaignId: 'c1', adSetId: 'as1', adId: 'ad1' });
    const req = {
      user: { metaUserIds: ['u'] },
      query: { account_id: 'acc' },
      body: {
        campaign: { name: 'C', objective: 'OUTCOME_SALES', special_ad_categories: [] },
        adSet: { name: 'AS', daily_budget: 500, optimization_goal: 'OFFSITE_CONVERSIONS', billing_event: 'IMPRESSIONS', targeting: { geo_locations: { countries: ['US'] }, age_min: 18, age_max: 65 }, promoted_object: { pixel_id: 'px1', custom_event_type: 'PURCHASE' } },
        ad: { name: 'AD', object_story_id: '111_222' },
      },
    } as never;
    const res = mockRes();
    await publishHandler(req, res as never);
    expect(res.statusCode).toBe(200);
    expect((res.body as { data: { adId: string } }).data.adId).toBe('ad1');
  });
});
```

- [ ] **Step 2: Запустить — упадёт**

Run: `npm test -- adManagementHandlers`
Expected: FAIL.

- [ ] **Step 3: Реализовать handler**

`lib/server/api/handlers/adManagementHandlers.ts`:
```ts
import type { NextApiResponse } from 'next';
import { getAccountByIdForMetaUsers } from '../../services/accountService';
import { publishFunnel, updateObjectStatus, updateObjectBudget, deleteAdObject } from '../../services/adManagementService';
import { PublishFunnelSchema } from '../../validation/adSchemas';
import { createHttpError, type ApiRequest } from '../http';

function qv(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length) return value[0];
  return undefined;
}

async function resolveAccount(req: ApiRequest) {
  if (!req.user) throw createHttpError(401, 'Authentication required');
  const accountId = qv(req.query.account_id);
  if (!accountId) throw createHttpError(400, 'Missing query param: account_id');
  const account = await getAccountByIdForMetaUsers(accountId, req.user.metaUserIds);
  if (!account) throw createHttpError(404, 'Account not found for current user');
  return account;
}

export async function publishHandler(req: ApiRequest, res: NextApiResponse): Promise<void> {
  const account = await resolveAccount(req);
  const parsed = PublishFunnelSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createHttpError(400, parsed.error.issues.map((i) => i.message).join('; '));
  }
  const result = await publishFunnel(account, parsed.data);
  res.status(200).json({ data: result });
}

type Level = 'campaign' | 'adset' | 'ad';

export function makeUpdateHandler(level: Level) {
  return async function updateHandler(req: ApiRequest, res: NextApiResponse): Promise<void> {
    const account = await resolveAccount(req);
    const objectId = qv(req.query.id);
    if (!objectId) throw createHttpError(400, 'Missing id');
    const body = (req.body ?? {}) as { status?: 'ACTIVE' | 'PAUSED' | 'DELETED'; daily_budget?: number; lifetime_budget?: number };
    if (req.method === 'DELETE') {
      await deleteAdObject(account, level, objectId);
      res.status(200).json({ data: { deleted: true } });
      return;
    }
    if (body.status) {
      await updateObjectStatus(account, level, objectId, body.status);
    }
    if (body.daily_budget || body.lifetime_budget) {
      await updateObjectBudget(account, level, objectId, { daily_budget: body.daily_budget, lifetime_budget: body.lifetime_budget });
    }
    res.status(200).json({ data: { updated: true } });
  };
}
```

- [ ] **Step 4: Создать роут**

`pages/api/ads/publish.ts`:
```ts
import { publishHandler } from '../../../lib/server/api/handlers/adManagementHandlers';
import { withApi } from '../../../lib/server/api/http';

export default withApi(publishHandler, { methods: ['POST'], requireAuth: true });
```

- [ ] **Step 5: Запустить — пройдёт**

Run: `npm test -- adManagementHandlers`
Expected: PASS.

- [ ] **Step 6: Проверить сборку**

Run: `npm run build`
Expected: успешная сборка (нет TS-ошибок).

- [ ] **Step 7: Commit**

```bash
git add lib/server/api/handlers/adManagementHandlers.ts lib/server/api/handlers/__tests__/adManagementHandlers.test.ts pages/api/ads/publish.ts
git commit -m "feat(api): POST /api/ads/publish"
```

---

## Task 12: API — управление (PATCH/DELETE) + справочники

**Files:**
- Modify: `pages/api/campaigns/[id].ts`, `pages/api/adsets/[id].ts`, `pages/api/ads/[id].ts`
- Create: `lib/server/api/handlers/metaLookupHandlers.ts`
- Create: `pages/api/meta/pages.ts`, `pages/api/meta/pages/[id]/posts.ts`, `pages/api/meta/pixels.ts`, `pages/api/meta/audiences.ts`, `pages/api/meta/targeting/search.ts`

- [ ] **Step 1: Подключить PATCH/DELETE к существующим роутам иерархии**

`pages/api/campaigns/[id].ts` заменить на:
```ts
import { getCampaignHandler } from '../../../lib/server/api/handlers/hierarchyHandlers';
import { makeUpdateHandler } from '../../../lib/server/api/handlers/adManagementHandlers';
import { withApi, type ApiRequest } from '../../../lib/server/api/http';
import type { NextApiResponse } from 'next';

const update = makeUpdateHandler('campaign');

export default withApi(
  async (req: ApiRequest, res: NextApiResponse) => {
    if (req.method === 'GET') return getCampaignHandler(req, res);
    return update(req, res);
  },
  { methods: ['GET', 'PATCH', 'DELETE'], requireAuth: true },
);
```

`pages/api/adsets/[id].ts` — аналогично, с `getAdSetHandler` и `makeUpdateHandler('adset')`:
```ts
import { getAdSetHandler } from '../../../lib/server/api/handlers/hierarchyHandlers';
import { makeUpdateHandler } from '../../../lib/server/api/handlers/adManagementHandlers';
import { withApi, type ApiRequest } from '../../../lib/server/api/http';
import type { NextApiResponse } from 'next';

const update = makeUpdateHandler('adset');

export default withApi(
  async (req: ApiRequest, res: NextApiResponse) => {
    if (req.method === 'GET') return getAdSetHandler(req, res);
    return update(req, res);
  },
  { methods: ['GET', 'PATCH', 'DELETE'], requireAuth: true },
);
```

`pages/api/ads/[id].ts` — аналогично, с `getAdHandler` и `makeUpdateHandler('ad')`:
```ts
import { getAdHandler } from '../../../lib/server/api/handlers/hierarchyHandlers';
import { makeUpdateHandler } from '../../../lib/server/api/handlers/adManagementHandlers';
import { withApi, type ApiRequest } from '../../../lib/server/api/http';
import type { NextApiResponse } from 'next';

const update = makeUpdateHandler('ad');

export default withApi(
  async (req: ApiRequest, res: NextApiResponse) => {
    if (req.method === 'GET') return getAdHandler(req, res);
    return update(req, res);
  },
  { methods: ['GET', 'PATCH', 'DELETE'], requireAuth: true },
);
```

> Примечание: текущие роуты импортируют handler по умолчанию; здесь оборачиваем в стрелочную функцию-диспетчер по методу. Проверить, что сигнатуры `getCampaignHandler/getAdSetHandler/getAdHandler` это `(req, res) => Promise<void>` (они такие — см. `hierarchyHandlers.ts`).

- [ ] **Step 2: Реализовать lookup-handlers**

`lib/server/api/handlers/metaLookupHandlers.ts`:
```ts
import type { NextApiResponse } from 'next';
import { getAccountByIdForMetaUsers } from '../../services/accountService';
import { metaClient } from '../../services/metaClient';
import { createHttpError, type ApiRequest } from '../http';

function qv(v: string | string[] | undefined): string | undefined {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v.length) return v[0];
  return undefined;
}

async function account(req: ApiRequest) {
  if (!req.user) throw createHttpError(401, 'Authentication required');
  const id = qv(req.query.account_id);
  if (!id) throw createHttpError(400, 'Missing query param: account_id');
  const acc = await getAccountByIdForMetaUsers(id, req.user.metaUserIds);
  if (!acc) throw createHttpError(404, 'Account not found for current user');
  if (!acc.ad_account_id || !acc.user_access_token) throw createHttpError(400, 'Account has no ad account or token');
  return acc;
}

export async function pagesHandler(req: ApiRequest, res: NextApiResponse) {
  const acc = await account(req);
  const data = await metaClient.getPages(acc.user_access_token as string);
  res.status(200).json({ data: data.data });
}

export async function pagePostsHandler(req: ApiRequest, res: NextApiResponse) {
  const acc = await account(req);
  const pageId = qv(req.query.id);
  if (!pageId) throw createHttpError(400, 'Missing page id');
  const data = await metaClient.getPromotablePosts(pageId, acc.user_access_token as string);
  res.status(200).json({ data: data.data });
}

export async function pixelsHandler(req: ApiRequest, res: NextApiResponse) {
  const acc = await account(req);
  const data = await metaClient.getAdPixels(acc.ad_account_id as string, acc.user_access_token as string);
  res.status(200).json({ data: data.data });
}

export async function audiencesHandler(req: ApiRequest, res: NextApiResponse) {
  const acc = await account(req);
  const [custom, saved] = await Promise.all([
    metaClient.getCustomAudiences(acc.ad_account_id as string, acc.user_access_token as string),
    metaClient.getSavedAudiences(acc.ad_account_id as string, acc.user_access_token as string),
  ]);
  res.status(200).json({ data: { custom: custom.data, saved: saved.data } });
}

export async function targetingSearchHandler(req: ApiRequest, res: NextApiResponse) {
  const acc = await account(req);
  const q = qv(req.query.q) || '';
  const type = qv(req.query.type) || 'adinterest';
  const data = type === 'adgeolocation'
    ? await metaClient.searchGeo(acc.user_access_token as string, q)
    : await metaClient.searchInterests(acc.user_access_token as string, q);
  res.status(200).json({ data: data.data });
}
```

- [ ] **Step 3: Создать роуты справочников**

`pages/api/meta/pages.ts`:
```ts
import { pagesHandler } from '../../../lib/server/api/handlers/metaLookupHandlers';
import { withApi } from '../../../lib/server/api/http';
export default withApi(pagesHandler, { methods: ['GET'], requireAuth: true });
```

`pages/api/meta/pages/[id]/posts.ts`:
```ts
import { pagePostsHandler } from '../../../../../lib/server/api/handlers/metaLookupHandlers';
import { withApi } from '../../../../../lib/server/api/http';
export default withApi(pagePostsHandler, { methods: ['GET'], requireAuth: true });
```

`pages/api/meta/pixels.ts`:
```ts
import { pixelsHandler } from '../../../lib/server/api/handlers/metaLookupHandlers';
import { withApi } from '../../../lib/server/api/http';
export default withApi(pixelsHandler, { methods: ['GET'], requireAuth: true });
```

`pages/api/meta/audiences.ts`:
```ts
import { audiencesHandler } from '../../../lib/server/api/handlers/metaLookupHandlers';
import { withApi } from '../../../lib/server/api/http';
export default withApi(audiencesHandler, { methods: ['GET'], requireAuth: true });
```

`pages/api/meta/targeting/search.ts`:
```ts
import { targetingSearchHandler } from '../../../../lib/server/api/handlers/metaLookupHandlers';
import { withApi } from '../../../../lib/server/api/http';
export default withApi(targetingSearchHandler, { methods: ['GET'], requireAuth: true });
```

> Проверить относительную глубину импортов `../` по факту расположения файлов.

- [ ] **Step 4: Проверить сборку и все тесты**

Run: `npm run build && npm test`
Expected: сборка успешна; все тесты проходят.

- [ ] **Step 5: Commit**

```bash
git add pages/api/campaigns/[id].ts pages/api/adsets/[id].ts pages/api/ads/[id].ts lib/server/api/handlers/metaLookupHandlers.ts pages/api/meta
git commit -m "feat(api): управление PATCH/DELETE + справочники"
```

---

## Финальная проверка (ручная, после деплоя/Dev Mode)

> Требует настроенного приложения Meta (см. спецификацию, раздел 13). Выполняется на реальном
> рекламном аккаунте; всё создаётся в PAUSED — трат нет.

- [ ] Залогиниться через Meta, выбрать аккаунт.
- [ ] `POST /api/ads/publish` с тестовым funnel → проверить, что в Ads Manager появились
  кампания/группа/объявление в статусе PAUSED.
- [ ] Проверить запись в `ad_operations` (status=success).
- [ ] Спровоцировать сбой (например, несуществующий пиксель) → убедиться, что кампания откатилась
  и операция помечена failed/rolled_back.
- [ ] `PATCH /api/campaigns/<id>` со `{status:'ACTIVE'}` и `{daily_budget:...}` → проверить в Ads Manager.
- [ ] `DELETE /api/ads/<id>` → объявление удалено/архивировано.

---

## Self-Review плана

- **Покрытие спеки (разделы 5–7, 9–12):** миграция (T2), MetaClient write/lookup (T4–T6),
  Zod (T7), маппер ошибок (T3), оркестратор+откат (T9), управление (T10), API публикации (T11),
  API управления и справочников (T12), версия Graph (T4), тесты (во всех). ✔
- **Плейсхолдеры:** нет — во всех шагах реальный код и команды. ✔
- **Согласованность типов:** методы `createCampaign/createAdSet/createAdCreativeFromPost/createAd/updateObject/deleteObject`
  и `PublishFunnelSchema/PublishFunnelInput` названы одинаково во всех задачах; `recordOperation/markOperation`,
  `publishFunnel/updateObjectStatus/updateObjectBudget/deleteAdObject` согласованы между сервисом, тестами и handler. ✔

## Вне этого плана (следующие планы)
- **План B** — UI-мастер создания + кнопки управления (lib/api.ts, types, translations, страницы/компоненты).
- **План C** — отчёты и экспорт (reportService, exporters CSV/XLSX, API, страница отчётов).
