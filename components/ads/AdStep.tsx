import { useEffect, useState } from 'react';
import { useLanguage } from '../LanguageProvider';
import { getPages, getPagePosts } from '../../lib/api';
import type { WizardState } from '../../lib/adWizard';
import type { MetaPage, MetaPromotablePost } from '../../lib/types';

const inputCls =
  'w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-ink';
const labelCls = 'block text-xs font-medium text-muted mb-1';

export function AdStep({
  value,
  onChange,
  accountId,
}: {
  value: WizardState['ad'];
  onChange: (v: WizardState['ad']) => void;
  accountId: string;
}) {
  const { t } = useLanguage();
  const [pages, setPages] = useState<MetaPage[]>([]);
  const [posts, setPosts] = useState<MetaPromotablePost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  useEffect(() => {
    if (accountId) getPages(accountId).then(setPages).catch(() => setPages([]));
  }, [accountId]);

  useEffect(() => {
    if (!accountId || !value.page_id) {
      setPosts([]);
      return;
    }
    setLoadingPosts(true);
    getPagePosts(accountId, value.page_id)
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoadingPosts(false));
  }, [accountId, value.page_id]);

  return (
    <div className="card space-y-4 p-5">
      <div>
        <label className={labelCls}>{t('ads.field.name')}</label>
        <input className={inputCls} value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
      </div>
      <div>
        <label className={labelCls}>{t('ads.field.page')}</label>
        <select
          className={inputCls}
          value={value.page_id ?? ''}
          onChange={(e) => onChange({ ...value, page_id: e.target.value || undefined, object_story_id: undefined })}
        >
          <option value="">—</option>
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>{t('ads.field.post')}</label>
        {loadingPosts ? (
          <p className="text-xs text-muted">…</p>
        ) : (
          <select
            className={inputCls}
            value={value.object_story_id ?? ''}
            onChange={(e) => onChange({ ...value, object_story_id: e.target.value || undefined })}
            disabled={!value.page_id}
          >
            <option value="">—</option>
            {posts.map((p) => (
              <option key={p.id} value={p.id}>
                {(p.message || p.id).slice(0, 80)}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
