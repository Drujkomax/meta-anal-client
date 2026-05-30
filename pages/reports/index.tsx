import { useEffect, useState, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getSession, getReport, reportExportUrl } from '../../lib/api';
import { DATE_PRESETS, DatePreset, ReportRow, AdLevel } from '../../lib/types';
import { Sidebar } from '../../components/Sidebar';
import { useLanguage } from '../../components/LanguageProvider';
import { useAccount } from '../../components/AccountProvider';

const LEVELS: AdLevel[] = ['campaign', 'adset', 'ad'];

export default function ReportsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { selectedAccountId, isLoading: accountsLoading } = useAccount();

  const [sessionLoading, setSessionLoading] = useState(true);
  const [level, setLevel] = useState<AdLevel>('campaign');
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  const days = DATE_PRESETS.find((p) => p.value === datePreset)?.days ?? 30;
  const dateFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - days + 1);
    return d.toISOString().split('T')[0];
  }, [days]);
  const dateTo = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    getSession()
      .then((res) => {
        if (!res.authenticated) router.push('/login');
        else setSessionLoading(false);
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const load = useCallback(() => {
    if (!selectedAccountId) return;
    setLoading(true);
    getReport(selectedAccountId, level, dateFrom, dateTo)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [selectedAccountId, level, dateFrom, dateTo]);

  useEffect(() => {
    if (!accountsLoading) load();
  }, [load, accountsLoading]);

  if (sessionLoading || accountsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted">
        {t('state.loading')}
      </div>
    );
  }

  const showAdSet = level !== 'campaign';
  const showAd = level === 'ad';
  const exportLevelUrl = (format: 'csv' | 'xlsx') =>
    selectedAccountId ? reportExportUrl(selectedAccountId, level, format, dateFrom, dateTo) : '#';

  return (
    <div className="min-h-screen bg-background">
      <Head>
        <title>{t('reports.title')} - Meta Analytics</title>
      </Head>

      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-4 px-4 py-6 md:grid-cols-[260px_1fr]">
        <Sidebar currentPath="/reports" />

        <main className="space-y-4">
          <header className="card flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-heading text-2xl font-semibold">{t('reports.title')}</h2>
              <p className="mt-1 text-sm text-muted">
                {dateFrom} → {dateTo}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                className="rounded-xl border border-line bg-panel px-3 py-2 text-sm text-ink"
                value={level}
                onChange={(e) => setLevel(e.target.value as AdLevel)}
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l === 'campaign' ? t('table.campaign') : l === 'adset' ? t('table.adset') : t('table.ad')}
                  </option>
                ))}
              </select>

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
                    {t(`preset.${preset.value}` as 'preset.7d')}
                  </button>
                ))}
              </div>

              <a
                href={exportLevelUrl('csv')}
                className="rounded-xl border border-line px-3 py-2 text-sm text-ink hover:bg-accentSoft"
              >
                {t('reports.exportCsv')}
              </a>
              <a
                href={exportLevelUrl('xlsx')}
                className="rounded-xl bg-ink px-3 py-2 text-sm text-white"
              >
                {t('reports.exportXlsx')}
              </a>
            </div>
          </header>

          <section className="card p-5">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted">{t('state.loading')}</div>
            ) : rows.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted">{t('reports.empty')}</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="min-w-full divide-y divide-line text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted">{t('table.campaign')}</th>
                      {showAdSet && (
                        <th className="px-3 py-2 text-left font-medium text-muted">{t('table.adset')}</th>
                      )}
                      {showAd && (
                        <th className="px-3 py-2 text-left font-medium text-muted">{t('table.ad')}</th>
                      )}
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
                    {rows.map((r, i) => (
                      <tr key={`${r.ad_id || r.adset_id || r.campaign_id}-${i}`} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-ink">{r.campaign_name || '—'}</td>
                        {showAdSet && <td className="px-3 py-2 text-ink">{r.adset_name || '—'}</td>}
                        {showAd && <td className="px-3 py-2 text-ink">{r.ad_name || '—'}</td>}
                        <td className="px-3 py-2 text-right font-medium text-ink">
                          {r.spend.toFixed(2)} {r.currency}
                        </td>
                        <td className="px-3 py-2 text-right text-ink">{new Intl.NumberFormat().format(r.impressions)}</td>
                        <td className="px-3 py-2 text-right text-ink">{new Intl.NumberFormat().format(r.reach)}</td>
                        <td className="px-3 py-2 text-right text-ink">{new Intl.NumberFormat().format(r.clicks)}</td>
                        <td className="px-3 py-2 text-right text-ink">{r.ctr.toFixed(2)}%</td>
                        <td className="px-3 py-2 text-right text-ink">{r.cpc.toFixed(4)}</td>
                        <td className="px-3 py-2 text-right text-ink">{r.cpm.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
