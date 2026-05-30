import { describe, it, expect, vi, beforeEach } from 'vitest';

const getAccount = vi.fn();
const publish = vi.fn();
vi.mock('../../../services/accountService', () => ({
  getAccountByIdForMetaUsers: (...a: unknown[]) => getAccount(...a),
}));
vi.mock('../../../services/adManagementService', () => ({
  publishFunnel: (...a: unknown[]) => publish(...a),
  updateObjectStatus: vi.fn(),
  updateObjectBudget: vi.fn(),
  deleteAdObject: vi.fn(),
}));

import { publishHandler } from '../adManagementHandlers';

function mockRes() {
  return {
    statusCode: 0,
    body: undefined as unknown,
    status(c: number) {
      this.statusCode = c;
      return this;
    },
    json(b: unknown) {
      this.body = b;
      return this;
    },
  };
}

beforeEach(() => {
  getAccount.mockReset();
  publish.mockReset();
});

describe('publishHandler', () => {
  it('400 без account_id', async () => {
    const req = { user: { metaUserIds: ['u'] }, query: {}, body: {} } as never;
    const res = mockRes();
    await expect(publishHandler(req, res as never)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('400 при невалидном теле', async () => {
    getAccount.mockResolvedValue({ id: 'acc', ad_account_id: 'act_1', user_access_token: 'T', owner_meta_user_id: 'u' });
    const req = { user: { metaUserIds: ['u'] }, query: { account_id: 'acc' }, body: { campaign: {} } } as never;
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
        adSet: {
          name: 'AS',
          daily_budget: 500,
          optimization_goal: 'OFFSITE_CONVERSIONS',
          billing_event: 'IMPRESSIONS',
          targeting: { geo_locations: { countries: ['US'] }, age_min: 18, age_max: 65 },
          promoted_object: { pixel_id: 'px1', custom_event_type: 'PURCHASE' },
        },
        ad: { name: 'AD', object_story_id: '111_222' },
      },
    } as never;
    const res = mockRes();
    await publishHandler(req, res as never);
    expect(res.statusCode).toBe(200);
    expect((res.body as { data: { adId: string } }).data.adId).toBe('ad1');
  });
});
