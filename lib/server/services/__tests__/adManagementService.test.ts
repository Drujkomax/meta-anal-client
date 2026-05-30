import { describe, it, expect, vi } from 'vitest';
import { publishFunnel } from '../adManagementService';
import type { PublishFunnelInput } from '../../validation/adSchemas';

const input: PublishFunnelInput = {
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

const account = {
  id: 'acc',
  owner_meta_user_id: 'u',
  ad_account_id: 'act_1',
  user_access_token: 'T',
} as never;

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
    expect(deps.client.createAd.mock.calls[0][2].status).toBe('PAUSED');
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
