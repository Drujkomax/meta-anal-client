import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getAdDetail, getSession } from '../../lib/api';
import { AdDetail } from '../../lib/types';
import { Sidebar } from '../../components/Sidebar';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { StatusBadge } from '../../components/StatusBadge';
import { MetricsRow } from '../../components/MetricsRow';
import { useLanguage } from '../../components/LanguageProvider';
import { useAccount } from '../../components/AccountProvider';
import { ManageActions } from '../../components/ManageActions';
import { DateRangePicker, type DateRange } from '../../components/DateRangePicker';
import { Language } from '../../lib/translations';

export default function AdDetailPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { selectedAccountId, isLoading: accountsLoading } = useAccount();
  const { id: adId } = router.query;
  
  const [sessionLoading, setSessionLoading] = useState(true);
  const [data, setData] = useState<AdDetail | null>(null);
  const [range, setRange] = useState<DateRange>({ from: daysAgo(30), to: new Date().toISOString().split('T')[0] });
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  function daysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days + 1);
    return d.toISOString().split('T')[0];
  }

  function shortDate(dateStr: string, lang: Language): string {
    const d = new Date(dateStr + 'T00:00:00');
    const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
    return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const dateFrom = range.from;
  const dateTo = range.to;

  useEffect(() => {
    getSession().then((res) => {
      if (!res.authenticated) router.push('/login');
      else setSessionLoading(false);
    }).catch(() => router.push('/login'));
  }, [router]);

  useEffect(() => {
    if (!selectedAccountId || !adId || accountsLoading) return;
    setIsLoading(true);
    getAdDetail(String(selectedAccountId), String(adId), dateFrom, dateTo)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setIsLoading(false));
  }, [selectedAccountId, adId, dateFrom, dateTo, accountsLoading, refreshKey]);

  if (sessionLoading || accountsLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted">{t('state.loading')}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Head>
        <title>{data?.name || 'Ad'} - Meta Analytics</title>
      </Head>

      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-4 px-4 py-6 md:grid-cols-[260px_1fr]">
        <Sidebar currentPath="/campaigns" />

        <main className="space-y-4">
          <Breadcrumbs 
            items={[
              { label: t('nav.campaigns' as any) || 'Campaigns', href: `/campaigns?account_id=${selectedAccountId}` },
              { label: data?.campaign_name || 'Loading...', href: data ? `/campaigns/${data.campaign_id}?account_id=${selectedAccountId}` : '#' },
              { label: data?.adset_name || 'Loading...', href: data ? `/adsets/${data.adset_id}?account_id=${selectedAccountId}` : '#' },
              { label: data?.name || 'Loading...' }
            ]} 
          />

          <header className="card flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <p className="font-heading text-2xl font-semibold">{data?.name || '...'}</p>
                {data && <StatusBadge status={data.status} />}
              </div>
              <p className="mt-1 text-sm text-muted">
                Ad {data?.id} {data?.creative_id ? `• Creative ID: ${data.creative_id}` : ''}
              </p>
              {data && (
                <div className="mt-3">
                  <ManageActions level="ad" objectId={String(adId)} status={data.status} onChanged={() => setRefreshKey((k) => k + 1)} />
                </div>
              )}
            </div>
            
            <DateRangePicker value={range} onChange={setRange} />
          </header>

          {isLoading ? (
            <div className="card p-8 text-center text-sm text-muted">{t('state.loading')}</div>
          ) : data ? (
            <>
              <MetricsRow metrics={data.metrics} t={t} />

              <section className="card p-5">
                <h3 className="font-heading text-lg font-semibold mb-4">{t('nav.dailyData' as any) || 'Daily Breakdown'}</h3>
                
                <div className="overflow-x-auto rounded-xl border border-line">
                  <table className="min-w-full divide-y divide-line text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted">{t('table.date' as any) || 'Date'}</th>
                        <th className="px-3 py-2 text-right font-medium text-muted">{t('table.spend')}</th>
                        <th className="px-3 py-2 text-right font-medium text-muted">{t('table.impr')}</th>
                        <th className="px-3 py-2 text-right font-medium text-muted">{t('table.clicks')}</th>
                        <th className="px-3 py-2 text-right font-medium text-muted">{t('table.ctr')}</th>
                        <th className="px-3 py-2 text-right font-medium text-muted">{t('table.cpc')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line bg-white">
                      {data.daily.length > 0 ? (
                        data.daily.map((day) => (
                          <tr key={day.date} className="hover:bg-slate-50 transition">
                            <td className="px-3 py-3 text-ink">
                              {shortDate(day.date, language)}
                            </td>
                            <td className="px-3 py-3 text-right font-medium text-ink">
                              ${day.spend.toFixed(2)}
                            </td>
                            <td className="px-3 py-3 text-right text-ink">
                              {new Intl.NumberFormat().format(day.impressions)}
                            </td>
                            <td className="px-3 py-3 text-right text-ink">
                              {new Intl.NumberFormat().format(day.clicks)}
                            </td>
                            <td className="px-3 py-3 text-right text-ink">
                              {day.ctr.toFixed(2)}%
                            </td>
                            <td className="px-3 py-3 text-right text-ink">
                              ${day.cpc.toFixed(4)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-sm text-muted">
                            {t('table.noData' as any) || 'No daily data found.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
