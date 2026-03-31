import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getAnalytics,
  getCrossAccountAnalytics,
  getIdentities,
  disconnectIdentity,
  getMetaLoginUrlWithNext,
  getTrends,
  logout,
  triggerSync,
} from '../lib/api';
import {
  AnalyticsResponse,
  ConnectedAccount,
  CrossAccountResponse,
  IdentityNode,
  DATE_PRESETS,
  DatePreset,
  TrendPoint,
} from '../lib/types';
import { AccountSwitcher } from './AccountSwitcher';
import { Sidebar } from './Sidebar';
import { HelperCard } from './HelperCard';
import { useLanguage } from './LanguageProvider';
import { useAccount } from './AccountProvider';
import { Language, TranslationKey } from '../lib/translations';
import { Trash2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DashboardProps {
  accounts: ConnectedAccount[];
  initialSelectedAccountId?: string;
}

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
  const d = new Date();
  d.setDate(d.getDate() - days + 1);
  return d.toISOString().split('T')[0];
}

function today(): string {
  return new Date().toISOString().split('T')[0];
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
// Metric card component
// ---------------------------------------------------------------------------

interface MetricCardProps {
  label: string;
  value: string;
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <article className="rounded-xl border border-line bg-white p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold text-ink">{value}</p>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Dashboard component
// ---------------------------------------------------------------------------

export function Dashboard() {
  const { t, language } = useLanguage();
  const { selectedAccountId, accounts } = useAccount();
  
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [crossAccount, setCrossAccount] = useState<CrossAccountResponse | null>(null);
  const [identities, setIdentities] = useState<IdentityNode[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDays = DATE_PRESETS.find((p) => p.value === datePreset)?.days ?? 30;
  const dateFrom = useMemo(() => daysAgo(selectedDays), [selectedDays]);
  const dateTo = useMemo(() => today(), []);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId),
    [accounts, selectedAccountId],
  );

  // -----------------------------------------------------------------------
  // Fetch data
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!selectedAccountId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [analyticsResult, trendsResult] = await Promise.all([
        getAnalytics(selectedAccountId, dateFrom, dateTo),
        getTrends(selectedAccountId, dateFrom, dateTo),
      ]);

      setData(analyticsResult);
      setTrends(trendsResult.data);
    } catch {
      setError(t('state.error'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccountId, dateFrom, dateTo, t]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    getIdentities().then(setIdentities).catch(console.error);
  }, [accounts]);

  // Fetch cross-account data when multiple accounts exist
  useEffect(() => {
    if (accounts.length <= 1) {
      setCrossAccount(null);
      return;
    }

    void getCrossAccountAnalytics(dateFrom, dateTo)
      .then(setCrossAccount)
      .catch(() => setCrossAccount(null));
  }, [accounts.length, dateFrom, dateTo]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleSync = async () => {
    if (!selectedAccountId || isSyncing) return;
    setIsSyncing(true);
    try {
      await triggerSync(selectedAccountId);
      await fetchData();
    } catch {
      // ignore
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectIdentity = async (identityId: string) => {
    if (!window.confirm('Are you sure you want to disconnect this source?')) return;
    try {
      await disconnectIdentity(identityId);
      // Let the page reload or trigger a state refresh
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert('Failed to disconnect identity');
    }
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-4 px-4 py-6 md:grid-cols-[260px_1fr]">
      <Sidebar />

      <main className="space-y-4">
        {/* Header */}
        <header className="card flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-heading text-2xl font-semibold">{t('header.title')}</p>
            <p className="mt-1 text-sm text-muted">
              {t('header.account')}:{' '}
              <span className="font-semibold text-ink">
                {selectedAccount?.name || t('state.none')}
              </span>
              {data?.lastSyncedAt && (
                <span className="ml-3 text-xs text-muted">
                  {t('header.synced')} {timeAgo(data.lastSyncedAt, t)}
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <AccountSwitcher />
            {/* Date preset selector */}
            <div className="flex rounded-xl border border-line bg-panel text-sm">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setDatePreset(preset.value)}
                  className={`px-3 py-2 transition ${
                    datePreset === preset.value
                      ? 'bg-ink text-white first:rounded-l-xl last:rounded-r-xl'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  {t(`preset.${preset.value}` as TranslationKey)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleSync}
              disabled={isSyncing}
              className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-muted transition hover:border-green-200 hover:text-green-600 disabled:opacity-50"
            >
              {isSyncing ? t('header.syncing') : t('header.sync')}
            </button>
            <button
              type="button"
              onClick={async () => {
                await logout();
                window.location.href = '/login';
              }}
              className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-muted transition hover:border-red-200 hover:text-red-600"
            >
              {t('header.logout')}
            </button>
          </div>
        </header>

        {/* Loading / Error states */}
        {isLoading && (
          <div className="card p-8 text-center text-sm text-muted">{t('state.loading')}</div>
        )}
        {error && !isLoading && (
          <div className="card border-red-200 p-4 text-sm text-red-600">{error}</div>
        )}
        
        {/* Helper Card showing 5-step tutorial (collapsed if sources > 0) */}
        {!isLoading && <HelperCard defaultExpanded={identities.length === 0} />}

        {/* Connected Sources (partner access) */}
        {!isLoading && identities.length > 0 && (
          <section className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-semibold">{t('identity.sources' as any) || 'Connected Sources'}</h3>
              <a
                href={getMetaLoginUrlWithNext('/dashboard')}
                className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                + {t('identity.connectAnother' as any) || 'Connect another client account'}
              </a>
            </div>
            
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="min-w-full divide-y divide-line text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted">Identity Name</th>
                    <th className="px-3 py-2 text-left font-medium text-muted">Date Connected</th>
                    <th className="px-3 py-2 text-right font-medium text-muted">Ad Accounts</th>
                    <th className="px-3 py-2 text-right font-medium text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-white">
                  {identities.map((identity) => (
                    <tr key={identity.meta_user_id} className="hover:bg-slate-50 transition">
                      <td className="px-3 py-3 font-medium text-ink">
                        {identity.meta_user_name || 'Unknown User'}
                        <div className="text-xs text-muted font-normal mt-0.5">{identity.meta_user_id}</div>
                      </td>
                      <td className="px-3 py-3 text-muted">
                        {shortDate(identity.connected_at, language)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="inline-flex items-center justify-center bg-blue-100 text-blue-700 font-semibold px-2 py-1 rounded-full text-xs">
                          {identity.account_count}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => handleDisconnectIdentity(identity.meta_user_id)}
                          className="text-red-600 hover:text-red-700 flex items-center justify-end gap-1 ml-auto transition"
                          title={t('identity.disconnect' as any) || 'Disconnect'}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline text-xs">{t('identity.disconnect' as any)}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Client with no identities but loading accounts? -> We should always let them see the helper card. handled above */}

        {/* Cross-account summary (only when 2+ accounts) */}
        {!isLoading && crossAccount && crossAccount.accounts.length > 1 && (
          <section className="card p-5">
            <h3 className="font-heading text-lg font-semibold">
              {t('section.crossAccount')}
              <span className="ml-2 text-sm font-normal text-muted">
                ({crossAccount.accounts.length} {t('section.accountsSuffix')})
              </span>
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
              <MetricCard
                label={t('metric.totalSpend')}
                value={formatCurrency(crossAccount.totals.spend)}
              />
              <MetricCard
                label={t('metric.impressions')}
                value={formatNumber(crossAccount.totals.impressions)}
              />
              <MetricCard
                label={t('metric.reach')}
                value={formatNumber(crossAccount.totals.reach)}
              />
              <MetricCard
                label={t('metric.clicks')}
                value={formatNumber(crossAccount.totals.clicks)}
              />
              <MetricCard label={t('metric.ctr')} value={`${crossAccount.totals.ctr.toFixed(2)}%`} />
              <MetricCard label={t('metric.cpc')} value={`$${crossAccount.totals.cpc.toFixed(4)}`} />
              <MetricCard label={t('metric.cpm')} value={`$${crossAccount.totals.cpm.toFixed(2)}`} />
            </div>
          </section>
        )}

        {/* Main analytics */}
        {!isLoading && !error && data && (
          <>
            {/* KPI cards */}
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
                <p className="mt-3 text-sm text-muted">
                  {data.ads.reason || t('state.notAvailable')}
                </p>
              ) : (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-9">
                    <MetricCard
                      label={t('metric.spend')}
                      value={formatCurrency(data.ads.summary.spend)}
                    />
                    <MetricCard
                      label={t('metric.impressions')}
                      value={formatNumber(data.ads.summary.impressions)}
                    />
                    <MetricCard
                      label={t('metric.reach')}
                      value={formatNumber(data.ads.summary.reach)}
                    />
                    <MetricCard
                      label={t('metric.clicks')}
                      value={formatNumber(data.ads.summary.clicks)}
                    />
                    <MetricCard
                      label={t('metric.uniqueClicks')}
                      value={formatNumber(data.ads.summary.uniqueClicks)}
                    />
                    <MetricCard
                      label={t('metric.ctr')}
                      value={`${data.ads.summary.ctr.toFixed(2)}%`}
                    />
                    <MetricCard
                      label={t('metric.cpc')}
                      value={`$${data.ads.summary.cpc.toFixed(4)}`}
                    />
                    <MetricCard
                      label={t('metric.cpm')}
                      value={`$${data.ads.summary.cpm.toFixed(2)}`}
                    />
                    <MetricCard
                      label={t('metric.frequency')}
                      value={data.ads.summary.frequency.toFixed(2)}
                    />
                  </div>

                  {/* Trend chart */}
                  {trends.length > 1 && (
                    <div className="mt-6">
                      <h4 className="mb-3 text-sm font-medium text-muted">{t('section.trends')}</h4>
                      <div className="h-[260px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trends} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="gradClicks" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
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
                              contentStyle={{
                                fontSize: 12,
                                borderRadius: 12,
                                border: '1px solid #e2e8f0',
                              }}
                              labelFormatter={(v) => shortDate(v, language)}
                            />
                            <Area
                              yAxisId="spend"
                              type="monotone"
                              dataKey="spend"
                              stroke="#6366f1"
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
                  )}

                  {/* Campaign table */}
                  <div className="mt-6 overflow-x-auto rounded-xl border border-line">
                    <table className="min-w-full divide-y divide-line text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-muted">
                            {t('table.campaign')}
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted">
                            {t('table.spend')}
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted">
                            {t('table.impr')}
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted">
                            {t('table.reach')}
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted">
                            {t('table.clicks')}
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted">
                            {t('table.ctr')}
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted">
                            {t('table.cpc')}
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted">
                            {t('table.cpm')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line bg-white">
                        {data.ads.top_campaigns.map((campaign) => (
                          <tr key={campaign.campaign_id}>
                            <td className="px-3 py-2 text-ink">{campaign.campaign_name}</td>
                            <td className="px-3 py-2 text-right text-ink">
                              {formatCurrency(campaign.spend)}
                            </td>
                            <td className="px-3 py-2 text-right text-ink">
                              {formatNumber(campaign.impressions)}
                            </td>
                            <td className="px-3 py-2 text-right text-ink">
                              {formatNumber(campaign.reach)}
                            </td>
                            <td className="px-3 py-2 text-right text-ink">
                              {formatNumber(campaign.clicks)}
                            </td>
                            <td className="px-3 py-2 text-right text-ink">
                              {campaign.ctr.toFixed(2)}%
                            </td>
                            <td className="px-3 py-2 text-right text-ink">
                              ${campaign.cpc.toFixed(4)}
                            </td>
                            <td className="px-3 py-2 text-right text-ink">
                              ${campaign.cpm.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
