import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryMock = vi.fn();
vi.mock('../../config/db', () => ({ query: (...args: unknown[]) => queryMock(...args) }));

import { recordOperation, markOperation } from '../adOperationsRepo';

beforeEach(() => queryMock.mockReset());

describe('adOperationsRepo', () => {
  it('recordOperation вставляет строку и возвращает id', async () => {
    queryMock.mockResolvedValue([{ id: '7' }]);
    const id = await recordOperation({
      accountId: 'a',
      metaUserId: 'u',
      operationType: 'create_campaign',
      level: 'campaign',
      requestPayload: { name: 'C' },
    });
    expect(id).toBe('7');
    expect(queryMock.mock.calls[0][0]).toMatch(/INSERT INTO ad_operations/);
  });

  it('markOperation обновляет статус', async () => {
    queryMock.mockResolvedValue([]);
    await markOperation('7', { status: 'success', metaObjectId: 'c1' });
    expect(queryMock.mock.calls[0][0]).toMatch(/UPDATE ad_operations/);
    expect(queryMock.mock.calls[0][1][1]).toBe('success');
  });
});
