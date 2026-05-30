import { useLanguage } from '../LanguageProvider';
import { OBJECTIVES, SPECIAL_CATEGORIES, type WizardState } from '../../lib/adWizard';

const inputCls =
  'w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-ink';
const labelCls = 'block text-xs font-medium text-muted mb-1';

export function CampaignStep({
  value,
  onChange,
}: {
  value: WizardState['campaign'];
  onChange: (v: WizardState['campaign']) => void;
}) {
  const { t } = useLanguage();

  const toggleCat = (c: string) => {
    const has = value.special_ad_categories.includes(c);
    onChange({
      ...value,
      special_ad_categories: has
        ? value.special_ad_categories.filter((x) => x !== c)
        : [...value.special_ad_categories, c],
    });
  };

  return (
    <div className="card space-y-4 p-5">
      <div>
        <label className={labelCls}>{t('ads.field.name')}</label>
        <input
          className={inputCls}
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </div>
      <div>
        <label className={labelCls}>{t('ads.field.objective')}</label>
        <select
          className={inputCls}
          value={value.objective}
          onChange={(e) =>
            onChange({ ...value, objective: e.target.value as WizardState['campaign']['objective'] })
          }
        >
          {OBJECTIVES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>{t('ads.field.specialCategory')}</label>
        <div className="flex flex-wrap gap-2">
          {SPECIAL_CATEGORIES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => toggleCat(c)}
              className={`rounded-lg border px-3 py-1 text-xs ${
                value.special_ad_categories.includes(c)
                  ? 'border-ink bg-accentSoft text-ink'
                  : 'border-line text-muted'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={labelCls}>{t('ads.field.dailyBudget')} (CBO, optional)</label>
        <input
          className={inputCls}
          type="number"
          min={1}
          value={value.dailyBudget ?? ''}
          onChange={(e) =>
            onChange({ ...value, dailyBudget: e.target.value ? Number(e.target.value) : undefined })
          }
        />
      </div>
    </div>
  );
}
