import { useState } from 'react';
import { useRouter } from 'next/router';
import { useLanguage } from '../LanguageProvider';
import { useAccount } from '../AccountProvider';
import { publishAd } from '../../lib/api';
import { buildPublishPayload, defaultWizardState, type WizardState } from '../../lib/adWizard';
import type { PublishFunnelResult } from '../../lib/types';
import { CampaignStep } from './CampaignStep';
import { AdSetStep } from './AdSetStep';
import { AdStep } from './AdStep';
import { ReviewStep } from './ReviewStep';

const STEPS = ['ads.step.campaign', 'ads.step.adset', 'ads.step.ad', 'ads.step.review'] as const;

export function CreateAdWizard() {
  const { t } = useLanguage();
  const { selectedAccountId } = useAccount();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(defaultWizardState());
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<PublishFunnelResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accountId = selectedAccountId ?? '';

  const canNext = (): boolean => {
    if (step === 0) return state.campaign.name.trim().length > 0;
    if (step === 1)
      return (
        state.adSet.name.trim().length > 0 &&
        (state.adSet.dailyBudget ?? 0) > 0 &&
        state.adSet.targeting.countries.length > 0 &&
        (state.adSet.optimization_goal !== 'OFFSITE_CONVERSIONS' || !!state.adSet.pixel_id)
      );
    if (step === 2) return state.ad.name.trim().length > 0 && !!state.ad.object_story_id;
    return true;
  };

  const publish = async () => {
    if (!accountId) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await publishAd(accountId, buildPublishPayload(state));
      setResult(res);
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data
        ?.error?.message;
      setError(msg || t('ads.error'));
    } finally {
      setPublishing(false);
    }
  };

  if (result) {
    return (
      <div className="card space-y-3 p-6">
        <p className="font-heading text-lg font-semibold text-green-600">✓ {t('ads.success')}</p>
        <p className="text-sm text-muted">{t('ads.note.paused')}</p>
        <pre className="overflow-x-auto rounded-xl bg-panel p-3 text-xs">{JSON.stringify(result, null, 2)}</pre>
        <div className="flex gap-2">
          <button
            className="rounded-xl bg-ink px-4 py-2 text-sm text-white"
            onClick={() => router.push(`/campaigns?account_id=${accountId}`)}
          >
            {t('nav.campaigns')}
          </button>
          <button
            className="rounded-xl border border-line px-4 py-2 text-sm text-ink"
            onClick={() => {
              setResult(null);
              setState(defaultWizardState());
              setStep(0);
            }}
          >
            {t('nav.createAd')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`flex-1 rounded-xl px-3 py-2 text-center text-xs ${
              i === step ? 'bg-ink text-white' : i < step ? 'bg-accentSoft text-ink' : 'bg-panel text-muted'
            }`}
          >
            {i + 1}. {t(s)}
          </div>
        ))}
      </div>

      {step === 0 && (
        <CampaignStep value={state.campaign} onChange={(c) => setState((s) => ({ ...s, campaign: c }))} />
      )}
      {step === 1 && (
        <AdSetStep value={state.adSet} onChange={(a) => setState((s) => ({ ...s, adSet: a }))} accountId={accountId} />
      )}
      {step === 2 && (
        <AdStep value={state.ad} onChange={(a) => setState((s) => ({ ...s, ad: a }))} accountId={accountId} />
      )}
      {step === 3 && <ReviewStep state={state} />}

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="flex justify-between">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
          className="rounded-xl border border-line px-4 py-2 text-sm text-ink disabled:opacity-40"
        >
          {t('ads.action.back')}
        </button>
        {step < 3 ? (
          <button
            type="button"
            disabled={!canNext()}
            onClick={() => setStep((s) => s + 1)}
            className="rounded-xl bg-ink px-4 py-2 text-sm text-white disabled:opacity-40"
          >
            {t('ads.action.next')}
          </button>
        ) : (
          <button
            type="button"
            disabled={publishing || !accountId}
            onClick={publish}
            className="rounded-xl bg-ink px-4 py-2 text-sm text-white disabled:opacity-40"
          >
            {publishing ? t('ads.action.publishing') : t('ads.action.publish')}
          </button>
        )}
      </div>
    </div>
  );
}
