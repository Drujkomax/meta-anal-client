import { useState } from 'react';
import { useLanguage } from './LanguageProvider';
import { useAccount } from './AccountProvider';
import { updateAdObjectStatus, updateAdObjectBudget, deleteAdObject } from '../lib/api';
import { toMinorUnits } from '../lib/adWizard';
import type { AdLevel } from '../lib/types';

export function ManageActions({
  level,
  objectId,
  status,
  onChanged,
}: {
  level: AdLevel;
  objectId: string;
  status?: string;
  onChanged?: () => void;
}) {
  const { t } = useLanguage();
  const { selectedAccountId } = useAccount();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const accountId = selectedAccountId ?? '';
  const isActive = (status || '').toUpperCase() === 'ACTIVE';

  const wrap = async (fn: () => Promise<void>) => {
    if (!accountId) return;
    setBusy(true);
    setErr(null);
    try {
      await fn();
      onChanged?.();
    } catch (e) {
      setErr(
        (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Error',
      );
    } finally {
      setBusy(false);
    }
  };

  const toggle = () =>
    wrap(() => updateAdObjectStatus(level, accountId, objectId, isActive ? 'PAUSED' : 'ACTIVE'));

  const editBudget = () => {
    const v = window.prompt(t('manage.newBudget'));
    if (!v) return;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return;
    wrap(() => updateAdObjectBudget(level, accountId, objectId, toMinorUnits(n)));
  };

  const del = () => {
    if (window.confirm(t('manage.confirmDelete'))) wrap(() => deleteAdObject(level, accountId, objectId));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={toggle}
        className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink disabled:opacity-40"
      >
        {busy ? t('manage.saving') : isActive ? t('manage.pause') : t('manage.activate')}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={editBudget}
        className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink disabled:opacity-40"
      >
        {t('manage.editBudget')}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={del}
        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-600 disabled:opacity-40"
      >
        {t('manage.delete')}
      </button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
