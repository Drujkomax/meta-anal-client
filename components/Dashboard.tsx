import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getAnalytics, getCrossAccountAnalytics, getTrends, logout, triggerSync } from '../lib/api';
import { AnalyticsResponse, CrossAccountResponse, TrendPoint } from '../lib/types';
import { AccountSwitcher } from './AccountSwitcher';
import { Sidebar } from './Sidebar';
import { useLanguage } from './LanguageProvider';
import { useAccount } from './AccountProvider';
import { DateRangePicker, type DateRange } from './DateRangePicker';
import { Language, TranslationKey } from '../lib/translations';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function daysAgo(days: number): string {
  return dayjs().subtract(days - 1, 'day').format('YYYY-MM-DD');
}

function today(): string {
  return dayjs().format('YYYY-MM-DD');
}

/** Format an ISO date for chart X axis */
function shortDate(dateStr: string, lang: Language): string {
  const d = new Date(dateStr + 'T00:00:00');
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

/** Relative time label for last sync */
function timeAgo(isoDate: string | null, t: (key: TranslationKey) => string): string {
  if (!isoDate) return t('time.never');
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('time.justNow');
  if (mins < 60) return `${mins}${t('time.minAgo')}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}${t('time.hourAgo')}`;
  return `${Math.floor(hours / 24)}${t('time.dayAgo')}`;
}

// ---------------------------------------------------------------------------
// Metric card
// ---------------------------------------------------------------------------

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-line bg-white p-3 shadow-soft">
      <p className="text-xs uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold text-ink">{value}</p>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export function Dashboard() {
  const { t, language } = useLanguage();
  const { selectedAccountId, accounts } = useAccount();

  const [range, setRange] = useState<DateRange>({ from: daysAgo(30), to: today() });
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [crossAccount, setCrossAccount] = useState<CrossAccountResponse | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateFrom = range.from;
  const dateTo = range.to;

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId),
    [accounts, selectedAccountId],
  );

  // Analytics + trends — guarded against out-of-order responses.
  useEffect(() => {
    if (!selectedAccountId) {
      setData(null);
      setTrends([]);
      setIsLoading(false);
      return;
    }
    let active = true;
    setIsLoading(true);
    setError(null);
    Promise.all([
      getAnalytics(selectedAccountId, dateFrom, dateTo),
      getTrends(selectedAccountId, dateFrom, dateTo),
    ])
      .then(([analytics, trendsResult]) => {
        if (!active) return;
        setData(analytics);
        setTrends(trendsResult?.data ?? []);
      })
      .catch(() => {
        if (active) setError(t('state.error'));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedAccountId, dateFrom, dateTo, refreshKey, t]);

  // Cross-account summary (2+ accounts) — also guarded.
  useEffect(() => {
    if (accounts.length <= 1) {
      setCrossAccount(null);
      return;
    }
    let active = true;
    getCrossAccountAnalytics(dateFrom, dateTo)
      .then((r) => {
        if (active) setCrossAccount(r);
      })
      .catch(() => {
        if (active) setCrossAccount(null);
      });
    return () => {
      active = false;
    };
  }, [accounts.length, dateFrom, dateTo, refreshKey]);

  const handleSync = async () => {
    if (!selectedAccountId || isSyncing) return;
    setIsSyncing(true);
    try {
      await triggerSync(selectedAccountId);
      setRefreshKey((k) => k + 1);
    } catch {
      setError(t('state.error'));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-4 px-4 py-6 md:grid-cols-[260px_1fr]">
        <Sidebar />

        <main className="space-y-4">
          <header className="card flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-heading text-2xl font-semibold">{t('header.title')}</p>
              <p className="mt-1 text-sm text-muted">
                {t('header.account')}:{' '}
                <span className="font-semibold text-ink">{selectedAccount?.name || t('state.none')}</span>
                {data?.lastSyncedAt && (
                  <span className="ml-3 text-xs text-muted">
                    {t('header.synced')} {timeAgo(data.lastSyncedAt, t)}
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-col flex-wrap gap-3 sm:flex-row sm:items-center">
              <AccountSwitcher />
              <DateRangePicker value={range} onChange={setRange} />
              <button
                type="button"
                onClick={handleSync}
                disabled={isSyncing}
                className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-muted transition hover:border-accent/40 hover:text-accent disabled:opacity-50"
              >
                {isSyncing ? t('header.syncing') : t('header.sync')}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-muted transition hover:border-red-200 hover:text-red-600"
              >
                {t('header.logout')}
              </button>
            </div>
          </header>

          {isLoading && (
            <div className="card p-8 text-center text-sm text-muted">{t('state.loading')}</div>
          )}
          {error && !isLoading && (
            <div className="card border-red-200 p-4 text-sm text-red-600">{error}</div>
          )}

          {/* Cross-account summary (2+ accounts) */}
          {!isLoading && crossAccount && (crossAccount.accounts?.length ?? 0) > 1 && (
            <section className="card p-5">
              <h3 className="font-heading text-lg font-semibold">
                {t('section.crossAccount')}
                <span className="ml-2 text-sm font-normal text-muted">
                  ({crossAccount.accounts.length} {t('section.accountsSuffix')})
                </span>
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
                <MetricCard label={t('metric.totalSpend')} value={formatCurrency(crossAccount.totals.spend)} />
                <MetricCard label={t('metric.impressions')} value={formatNumber(crossAccount.totals.impressions)} />
                <MetricCard label={t('metric.reach')} value={formatNumber(crossAccount.totals.reach)} />
                <MetricCard label={t('metric.clicks')} value={formatNumber(crossAccount.totals.clicks)} />
                <MetricCard label={t('metric.ctr')} value={`${crossAccount.totals.ctr.toFixed(2)}%`} />
                <MetricCard label={t('metric.cpc')} value={`$${crossAccount.totals.cpc.toFixed(4)}`} />
                <MetricCard label={t('metric.cpm')} value={`$${crossAccount.totals.cpm.toFixed(2)}`} />
              </div>
            </section>
          )}

          {/* Main analytics */}
          {!isLoading && !error && data && (
            <section id="ads" className="card p-5">
              <h3 className="font-heading text-lg font-semibold">
                {t('section.adInsights')}
                <span className="ml-2 text-sm font-normal text-muted">
                  {data.dateRange.from} — {data.dateRange.to}
                </span>
              </h3>
              <p className="mt-1 text-sm text-muted">
                {data.account.adAccountName || data.account.name} ({data.account.adAccountId})
              </p>

              {!data.ads.available ? (
                <p className="mt-3 text-sm text-muted">{data.ads.reason || t('state.notAvailable')}</p>
              ) : (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-9">
                    <MetricCard label={t('metric.spend')} value={formatCurrency(data.ads.summary.spend)} />
                    <MetricCard label={t('metric.impressions')} value={formatNumber(data.ads.summary.impressions)} />
                    <MetricCard label={t('metric.reach')} value={formatNumber(data.ads.summary.reach)} />
                    <MetricCard label={t('metric.clicks')} value={formatNumber(data.ads.summary.clicks)} />
                    <MetricCard label={t('metric.uniqueClicks')} value={formatNumber(data.ads.summary.uniqueClicks)} />
                    <MetricCard label={t('metric.ctr')} value={`${data.ads.summary.ctr.toFixed(2)}%`} />
                    <MetricCard label={t('metric.cpc')} value={`$${data.ads.summary.cpc.toFixed(4)}`} />
                    <MetricCard label={t('metric.cpm')} value={`$${data.ads.summary.cpm.toFixed(2)}`} />
                    <MetricCard label={t('metric.frequency')} value={data.ads.summary.frequency.toFixed(2)} />
                  </div>

                  {trends.length > 1 ? (
                    <div className="mt-6">
                      <h4 className="mb-3 text-sm font-medium text-muted">{t('section.trends')}</h4>
                      <div className="h-[260px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trends} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1877F2" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#1877F2" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="gradClicks" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ef" />
                            <XAxis
                              dataKey="date"
                              tickFormatter={(v) => shortDate(v, language)}
                              tick={{ fontSize: 11, fill: '#94a3b8' }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              yAxisId="spend"
                              tick={{ fontSize: 11, fill: '#94a3b8' }}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(v: number) => `$${v}`}
                            />
                            <YAxis
                              yAxisId="clicks"
                              orientation="right"
                              tick={{ fontSize: 11, fill: '#94a3b8' }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip
                              contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e6e9ef' }}
                              labelFormatter={(v) => shortDate(v, language)}
                            />
                            <Area
                              yAxisId="spend"
                              type="monotone"
                              dataKey="spend"
                              stroke="#1877F2"
                              fill="url(#gradSpend)"
                              strokeWidth={2}
                              name={`${t('metric.spend')} ($)`}
                            />
                            <Area
                              yAxisId="clicks"
                              type="monotone"
                              dataKey="clicks"
                              stroke="#10b981"
                              fill="url(#gradClicks)"
                              strokeWidth={2}
                              name={t('metric.clicks')}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-6 rounded-xl border border-line bg-panel p-4 text-center text-xs text-muted">
                      {t('state.noData')}
                    </p>
                  )}

                  <div className="mt-6 overflow-x-auto rounded-xl border border-line">
                    <table className="min-w-full divide-y divide-line text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-muted">{t('table.campaign')}</th>
                          <th className="px-3 py-2 text-right font-medium text-muted">{t('table.spend')}</th>
                          <th className="px-3 py-2 text-right font-medium text-muted">{t('table.impr')}</th>
                          <th className="px-3 py-2 text-right font-medium text-muted">{t('table.reach')}</th>
                          <th className="px-3 py-2 text-right font-medium text-muted">{t('table.clicks')}</th>
                          <th className="px-3 py-2 text-right font-medium text-muted">{t('table.ctr')}</th>
                          <th className="px-3 py-2 text-right font-medium text-muted">{t('table.cpc')}</th>
                          <th className="px-3 py-2 text-right font-medium text-muted">{t('table.cpm')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line bg-white">
                        {data.ads.top_campaigns.map((campaign) => (
                          <tr key={campaign.campaign_id}>
                            <td className="px-3 py-2 text-ink">{campaign.campaign_name}</td>
                            <td className="px-3 py-2 text-right text-ink">{formatCurrency(campaign.spend)}</td>
                            <td className="px-3 py-2 text-right text-ink">{formatNumber(campaign.impressions)}</td>
                            <td className="px-3 py-2 text-right text-ink">{formatNumber(campaign.reach)}</td>
                            <td className="px-3 py-2 text-right text-ink">{formatNumber(campaign.clicks)}</td>
                            <td className="px-3 py-2 text-right text-ink">{campaign.ctr.toFixed(2)}%</td>
                            <td className="px-3 py-2 text-right text-ink">${campaign.cpc.toFixed(4)}</td>
                            <td className="px-3 py-2 text-right text-ink">${campaign.cpm.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
