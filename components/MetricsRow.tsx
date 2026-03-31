import { HierarchyMetrics } from '../lib/types';
import { TranslationKey } from '../lib/translations';

interface MetricsRowProps {
  metrics: HierarchyMetrics;
  t: (key: TranslationKey) => string;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function MetricsRow({ metrics, t }: MetricsRowProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7 mb-6">
      <MetricCard label={t('metric.spend')} value={formatCurrency(metrics.spend)} />
      <MetricCard label={t('metric.impressions')} value={formatNumber(metrics.impressions)} />
      <MetricCard label={t('metric.reach')} value={formatNumber(metrics.reach)} />
      <MetricCard label={t('metric.clicks')} value={formatNumber(metrics.clicks)} />
      <MetricCard label={t('metric.ctr')} value={`${metrics.ctr.toFixed(2)}%`} />
      <MetricCard label={t('metric.cpc')} value={`$${metrics.cpc.toFixed(4)}`} />
      <MetricCard label={t('metric.cpm')} value={`$${metrics.cpm.toFixed(2)}`} />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-line bg-white p-3 shadow-sm">
      <p className="text-xs uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold text-ink">{value}</p>
    </article>
  );
}
