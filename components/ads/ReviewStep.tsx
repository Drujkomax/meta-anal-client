import { useLanguage } from '../LanguageProvider';
import { buildPublishPayload, type WizardState } from '../../lib/adWizard';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-1">
      <span className="text-muted">{label}</span>
      <span className="text-right text-ink">{value}</span>
    </div>
  );
}

export function ReviewStep({ state }: { state: WizardState }) {
  const { t } = useLanguage();
  const payload = buildPublishPayload(state);

  return (
    <div className="card space-y-3 p-5 text-sm">
      <p className="rounded-xl bg-accentSoft px-3 py-2 text-xs text-ink">{t('ads.note.paused')}</p>
      <Row label={t('ads.step.campaign')} value={`${state.campaign.name} · ${state.campaign.objective}`} />
      <Row
        label={t('ads.step.adset')}
        value={`${state.adSet.name} · ${state.adSet.optimization_goal} · ${state.adSet.dailyBudget ?? '-'}/d`}
      />
      <Row label={t('ads.field.countries')} value={state.adSet.targeting.countries.join(', ') || '—'} />
      <Row
        label={t('ads.field.interests')}
        value={state.adSet.targeting.interests.map((i) => i.name).join(', ') || '—'}
      />
      <Row label={t('ads.step.ad')} value={`${state.ad.name} · ${state.ad.object_story_id ?? '—'}`} />
      {payload.adSet.promoted_object && (
        <Row
          label={t('ads.field.conversionEvent')}
          value={`${payload.adSet.promoted_object.custom_event_type} (pixel ${payload.adSet.promoted_object.pixel_id})`}
        />
      )}
    </div>
  );
}
