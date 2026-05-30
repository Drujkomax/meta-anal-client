import { describe, it, expect, vi } from 'vitest';
import type { AxiosInstance } from 'axios';
import { MetaClient } from '../metaClient';

function clientWithGet(get: ReturnType<typeof vi.fn>) {
  return new MetaClient({ get, post: vi.fn(), delete: vi.fn() } as unknown as AxiosInstance);
}

describe('MetaClient lookup', () => {
  it('getAdPixels читает /act_<id>/adspixels', async () => {
    const get = vi.fn().mockResolvedValue({ data: { data: [{ id: 'p1', name: 'Pixel' }] }, headers: {} });
    const res = await clientWithGet(get).getAdPixels('act_1', 'T');
    expect(res.data[0].id).toBe('p1');
    expect(get.mock.calls[0][0]).toBe('/act_1/adspixels');
  });

  it('searchInterests читает /search?type=adinterest', async () => {
    const get = vi.fn().mockResolvedValue({ data: { data: [{ id: 'i1', name: 'Cats' }] }, headers: {} });
    const res = await clientWithGet(get).searchInterests('T', 'cats');
    expect(res.data[0].name).toBe('Cats');
    expect(get.mock.calls[0][0]).toBe('/search');
    expect(get.mock.calls[0][1].params.type).toBe('adinterest');
  });

  it('getCustomAudiences читает /act_<id>/customaudiences', async () => {
    const get = vi.fn().mockResolvedValue({ data: { data: [{ id: 'a1', name: 'LAL', subtype: 'LOOKALIKE' }] }, headers: {} });
    const res = await clientWithGet(get).getCustomAudiences('act_1', 'T');
    expect(res.data[0].subtype).toBe('LOOKALIKE');
    expect(get.mock.calls[0][0]).toBe('/act_1/customaudiences');
  });

  it('getPromotablePosts читает /<page_id>/ads_posts', async () => {
    const get = vi.fn().mockResolvedValue({ data: { data: [{ id: '111_222', message: 'hi' }] }, headers: {} });
    const res = await clientWithGet(get).getPromotablePosts('111', 'T');
    expect(res.data[0].id).toBe('111_222');
    expect(get.mock.calls[0][0]).toBe('/111/ads_posts');
  });
});
