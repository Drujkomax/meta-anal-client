import { useEffect, useState } from 'react';
import { useLanguage } from '../LanguageProvider';
import { getAudiences, getPixels, searchTargeting } from '../../lib/api';
import { OPTIMIZATION_GOALS, EVENT_TYPES, PLACEMENTS, type WizardState } from '../../lib/adWizard';
import type { MetaAudience, MetaPixel, TargetingSearchItem } from '../../lib/types';

const inputCls =
  'w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-ink';
const labelCls = 'block text-xs font-medium text-muted mb-1';
type Targeting = WizardState['adSet']['targeting'];

export function AdSetStep({
  value,
  onChange,
  accountId,
}: {
  value: WizardState['adSet'];
  onChange: (v: WizardState['adSet']) => void;
  accountId: string;
}) {
  const { t } = useLanguage();
  const [pixels, setPixels] = useState<MetaPixel[]>([]);
  const [audiences, setAudiences] = useState<MetaAudience[]>([]);
  const [interestQ, setInterestQ] = useState('');
  const [interestResults, setInterestResults] = useState<TargetingSearchItem[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!accountId) return;
    getPixels(accountId).then(setPixels).catch(() => setPixels([]));
    getAudiences(accountId).then((a) => setAudiences(a.custom)).catch(() => setAudiences([]));
  }, [accountId]);

  const tg = value.targeting;
  const setTg = (patch: Partial<Targeting>) => onChange({ ...value, targeting: { ...tg, ...patch } });

  const runSearch = async () => {
    if (!interestQ.trim() || !accountId) return;
    setSearching(true);
    try {
      setInterestResults(await searchTargeting(accountId, interestQ));
    } catch {
      setInterestResults([]);
    } finally {
      setSearching(false);
    }
  };

  const addInterest = (item: TargetingSearchItem) => {
    if (!item.id || tg.interests.some((i) => i.id === item.id)) return;
    setTg({ interests: [...tg.interests, { id: item.id, name: item.name }] });
  };

  const toggleAudience = (field: 'custom_audiences' | 'excluded_custom_audiences', a: MetaAudience) => {
    const list = tg[field];
    const has = list.some((x) => x.id === a.id);
    setTg({
      [field]: has ? list.filter((x) => x.id !== a.id) : [...list, { id: a.id, name: a.name }],
    } as Partial<Targeting>);
  };

  const togglePlacement = (p: string) => {
    const has = tg.publisher_platforms.includes(p);
    setTg({
      publisher_platforms: has
        ? tg.publisher_platforms.filter((x) => x !== p)
        : [...tg.publisher_platforms, p],
    });
  };

  const toggleGender = (g: number) => {
    const has = tg.genders.includes(g);
    setTg({ genders: has ? tg.genders.filter((x) => x !== g) : [...tg.genders, g] });
  };

  const isConv = value.optimization_goal === 'OFFSITE_CONVERSIONS';

  return (
    <div className="space-y-4">
      <div className="card space-y-4 p-5">
        <div>
          <label className={labelCls}>{t('ads.field.name')}</label>
          <input className={inputCls} value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t('ads.field.dailyBudget')}</label>
            <input
              type="number"
              min={1}
              className={inputCls}
              value={value.dailyBudget ?? ''}
              onChange={(e) => onChange({ ...value, dailyBudget: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
          <div>
            <label className={labelCls}>{t('ads.field.optimization')}</label>
            <select
              className={inputCls}
              value={value.optimization_goal}
              onChange={(e) => onChange({ ...value, optimization_goal: e.target.value })}
            >
              {OPTIMIZATION_GOALS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>
        {isConv && (
          <div className="space-y-3 rounded-xl border border-line p-3">
            <p className="text-xs text-muted">{t('ads.note.conversions')}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t('ads.field.pixel')}</label>
                <select
                  className={inputCls}
                  value={value.pixel_id ?? ''}
                  onChange={(e) => onChange({ ...value, pixel_id: e.target.value || undefined })}
                >
                  <option value="">—</option>
                  {pixels.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t('ads.field.conversionEvent')}</label>
                <select
                  className={inputCls}
                  value={value.custom_event_type ?? ''}
                  onChange={(e) => onChange({ ...value, custom_event_type: e.target.value || undefined })}
                >
                  <option value="">—</option>
                  {EVENT_TYPES.map((ev) => (
                    <option key={ev} value={ev}>
                      {ev}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card space-y-4 p-5">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>{t('ads.field.ageMin')}</label>
            <input type="number" min={13} max={65} className={inputCls} value={tg.age_min} onChange={(e) => setTg({ age_min: Number(e.target.value) })} />
          </div>
          <div>
            <label className={labelCls}>{t('ads.field.ageMax')}</label>
            <input type="number" min={13} max={65} className={inputCls} value={tg.age_max} onChange={(e) => setTg({ age_max: Number(e.target.value) })} />
          </div>
          <div>
            <label className={labelCls}>{t('ads.field.genders')}</label>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setTg({ genders: [] })} className={`rounded-lg border px-2 py-1 text-xs ${tg.genders.length === 0 ? 'border-ink bg-accentSoft' : 'border-line text-muted'}`}>{t('ads.opt.all')}</button>
              <button type="button" onClick={() => toggleGender(1)} className={`rounded-lg border px-2 py-1 text-xs ${tg.genders.includes(1) ? 'border-ink bg-accentSoft' : 'border-line text-muted'}`}>{t('ads.opt.male')}</button>
              <button type="button" onClick={() => toggleGender(2)} className={`rounded-lg border px-2 py-1 text-xs ${tg.genders.includes(2) ? 'border-ink bg-accentSoft' : 'border-line text-muted'}`}>{t('ads.opt.female')}</button>
            </div>
          </div>
        </div>

        <div>
          <label className={labelCls}>{t('ads.field.countries')}</label>
          <input
            className={inputCls}
            value={tg.countries.join(', ')}
            onChange={(e) => setTg({ countries: e.target.value.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean) })}
            placeholder="US, GB, UZ"
          />
        </div>

        <div>
          <label className={labelCls}>{t('ads.field.placements')}</label>
          <div className="flex flex-wrap gap-2">
            {PLACEMENTS.map((p) => (
              <button key={p} type="button" onClick={() => togglePlacement(p)} className={`rounded-lg border px-3 py-1 text-xs ${tg.publisher_platforms.includes(p) ? 'border-ink bg-accentSoft text-ink' : 'border-line text-muted'}`}>{p}</button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>{t('ads.field.interests')}</label>
          <div className="flex gap-2">
            <input
              className={inputCls}
              value={interestQ}
              onChange={(e) => setInterestQ(e.target.value)}
              placeholder={t('ads.action.addInterest')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  runSearch();
                }
              }}
            />
            <button type="button" onClick={runSearch} className="rounded-xl border border-line px-3 py-2 text-sm text-ink">{searching ? '…' : 'OK'}</button>
          </div>
          {interestResults.length > 0 && (
            <div className="mt-2 max-h-32 overflow-y-auto rounded-xl border border-line">
              {interestResults.map((r) => (
                <button key={r.id} type="button" onClick={() => addInterest(r)} className="block w-full px-3 py-1 text-left text-sm hover:bg-accentSoft">{r.name}</button>
              ))}
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {tg.interests.map((i) => (
              <span key={i.id} className="flex items-center gap-1 rounded-lg bg-accentSoft px-2 py-1 text-xs">
                {i.name}
                <button type="button" onClick={() => setTg({ interests: tg.interests.filter((x) => x.id !== i.id) })}>×</button>
              </span>
            ))}
          </div>
        </div>

        {audiences.length > 0 && (
          <>
            <div>
              <label className={labelCls}>{t('ads.field.customAudiences')}</label>
              <div className="flex flex-wrap gap-2">
                {audiences.map((a) => (
                  <button key={a.id} type="button" onClick={() => toggleAudience('custom_audiences', a)} className={`rounded-lg border px-3 py-1 text-xs ${tg.custom_audiences.some((x) => x.id === a.id) ? 'border-ink bg-accentSoft text-ink' : 'border-line text-muted'}`}>
                    {a.name}{a.subtype === 'LOOKALIKE' ? ' (LAL)' : ''}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>{t('ads.field.excludedAudiences')}</label>
              <div className="flex flex-wrap gap-2">
                {audiences.map((a) => (
                  <button key={a.id} type="button" onClick={() => toggleAudience('excluded_custom_audiences', a)} className={`rounded-lg border px-3 py-1 text-xs ${tg.excluded_custom_audiences.some((x) => x.id === a.id) ? 'border-red-400 bg-red-50 text-red-600' : 'border-line text-muted'}`}>
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
