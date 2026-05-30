import { describe, it, expect, vi } from 'vitest';
import type { AxiosInstance } from 'axios';
import { MetaClient } from '../metaClient';

function client(http: Partial<AxiosInstance>) {
  return new MetaClient({ post: vi.fn(), delete: vi.fn(), get: vi.fn(), ...http } as unknown as AxiosInstance);
}

describe('MetaClient write', () => {
  it('createCampaign шлёт POST на /act_<id>/campaigns с access_token', async () => {
    const post = vi.fn().mockResolvedValue({ data: { id: '123' }, headers: {} });
    const c = client({ post });
    const res = await c.createCampaign('act_999', 'TOKEN', {
      name: 'C',
      objective: 'OUTCOME_TRAFFIC',
      status: 'PAUSED',
      special_ad_categories: '[]',
    });
    expect(res.id).toBe('123');
    const [endpoint, , config] = post.mock.calls[0];
    expect(endpoint).toBe('/act_999/campaigns');
    expect(config.params.access_token).toBe('TOKEN');
    expect(config.params.name).toBe('C');
  });

  it('нормализует id без префикса act_', async () => {
    const post = vi.fn().mockResolvedValue({ data: { id: 'x' }, headers: {} });
    const c = client({ post });
    await c.createCampaign('999', 'T', { name: 'C' });
    expect(post.mock.calls[0][0]).toBe('/act_999/campaigns');
  });

  it('createAdSet шлёт POST на /act_<id>/adsets', async () => {
    const post = vi.fn().mockResolvedValue({ data: { id: 'as1' }, headers: {} });
    const c = client({ post });
    const res = await c.createAdSet('act_1', 'T', { name: 'AS', campaign_id: 'c1' });
    expect(res.id).toBe('as1');
    expect(post.mock.calls[0][0]).toBe('/act_1/adsets');
  });

  it('createAdCreativeFromPost шлёт POST на /act_<id>/adcreatives', async () => {
    const post = vi.fn().mockResolvedValue({ data: { id: 'cr1' }, headers: {} });
    const c = client({ post });
    const res = await c.createAdCreativeFromPost('act_1', 'T', { name: 'cr', object_story_id: '111_222' });
    expect(res.id).toBe('cr1');
    expect(post.mock.calls[0][0]).toBe('/act_1/adcreatives');
  });

  it('createAd шлёт POST на /act_<id>/ads', async () => {
    const post = vi.fn().mockResolvedValue({ data: { id: 'ad1' }, headers: {} });
    const c = client({ post });
    const res = await c.createAd('act_1', 'T', { name: 'ad', adset_id: 'as1', creative_id: 'cr1' });
    expect(res.id).toBe('ad1');
    expect(post.mock.calls[0][0]).toBe('/act_1/ads');
  });

  it('updateObject шлёт POST на /<id>', async () => {
    const post = vi.fn().mockResolvedValue({ data: { success: true }, headers: {} });
    const c = client({ post });
    await c.updateObject('c1', 'T', 'act_1', { status: 'PAUSED' });
    expect(post.mock.calls[0][0]).toBe('/c1');
    expect(post.mock.calls[0][2].params.status).toBe('PAUSED');
  });

  it('deleteObject шлёт DELETE на /<id>', async () => {
    const del = vi.fn().mockResolvedValue({ data: { success: true }, headers: {} });
    const c = client({ delete: del });
    await c.deleteObject('c1', 'T', 'act_1');
    expect(del.mock.calls[0][0]).toBe('/c1');
  });
});
