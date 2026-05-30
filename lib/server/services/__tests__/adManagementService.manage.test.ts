import { describe, it, expect, vi } from 'vitest';
import { updateObjectStatus, updateObjectBudget, deleteAdObject } from '../adManagementService';

const account = {
  id: 'acc',
  owner_meta_user_id: 'u',
  ad_account_id: 'act_1',
  user_access_token: 'T',
} as never;

function deps() {
  return {
    client: {
      updateObject: vi.fn().mockResolvedValue({ success: true }),
      deleteObject: vi.fn().mockResolvedValue({ success: true }),
    },
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

  it('пробрасывает понятную ошибку при сбое Meta', async () => {
    const d = deps();
    d.client.updateObject = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(updateObjectStatus(account, 'campaign', 'c1', 'ACTIVE', d as never)).rejects.toThrow(/boom/);
    expect(d.markOperation).toHaveBeenCalledWith('op', expect.objectContaining({ status: 'failed' }));
  });
});
