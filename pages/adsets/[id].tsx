import { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getAdSetDetail, getSession } from '../../lib/api';
import { AdSetDetail, DATE_PRESETS, DatePreset } from '../../lib/types';
import { Sidebar } from '../../components/Sidebar';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { StatusBadge } from '../../components/StatusBadge';
import { MetricsRow } from '../../components/MetricsRow';
import { useLanguage } from '../../components/LanguageProvider';
import { useAccount } from '../../components/AccountProvider';

export default function AdSetDetailPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { selectedAccountId, isLoading: accountsLoading } = useAccount();
  const { id: adsetId } = router.query;
  
  const [sessionLoading, setSessionLoading] = useState(true);
  const [data, setData] = useState<AdSetDetail | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [isLoading, setIsLoading] = useState(false);

  const selectedDays = DATE_PRESETS.find((p) => p.value === datePreset)?.days ?? 30;
  
  function daysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days + 1);
    return d.toISOString().split('T')[0];
  }

  const dateFrom = useMemo(() => daysAgo(selectedDays), [selectedDays]);
  const dateTo = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    getSession().then((res) => {
      if (!res.authenticated) router.push('/login');
      else setSessionLoading(false);
    }).catch(() => router.push('/login'));
  }, [router]);

  useEffect(() => {
    if (!selectedAccountId || !adsetId || accountsLoading) return;
    setIsLoading(true);
    getAdSetDetail(String(selectedAccountId), String(adsetId), dateFrom, dateTo)
      .then(setData)
      .finally(() => setIsLoading(false));
  }, [selectedAccountId, adsetId, dateFrom, dateTo, accountsLoading]);

  if (sessionLoading || accountsLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted">{t('state.loading')}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Head>
        <title>{data?.name || 'Ad Set'} - Meta Analytics</title>
      </Head>

      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-4 px-4 py-6 md:grid-cols-[260px_1fr]">
        <Sidebar currentPath="/campaigns" />

        <main className="space-y-4">
          <Breadcrumbs 
            items={[
              { label: t('nav.campaigns' as any) || 'Campaigns', href: `/campaigns?account_id=${selectedAccountId}` },
              { label: data?.campaign_name || 'Loading...', href: data ? `/campaigns/${data.campaign_id}?account_id=${selectedAccountId}` : '#' },
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
                Ad Set {data?.id} • {data?.optimization_goal}
              </p>
            </div>
            
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
                  {t(`preset.${preset.value}` as any)}
                </button>
              ))}
            </div>
          </header>

          {isLoading ? (
            <div className="card p-8 text-center text-sm text-muted">{t('state.loading')}</div>
          ) : data ? (
            <>
              <MetricsRow metrics={data.metrics} t={t} />

              <section className="card p-5">
                <h3 className="font-heading text-lg font-semibold mb-4">{t('nav.ads' as any) || 'Ads'}</h3>
                
                <div className="overflow-x-auto rounded-xl border border-line">
                  <table className="min-w-full divide-y divide-line text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted">{t('table.ad' as any) || 'Ad'}</th>
                        <th className="px-3 py-2 text-center font-medium text-muted">{t('table.status' as any) || 'Status'}</th>
                        <th className="px-3 py-2 text-right font-medium text-muted">{t('table.spend')}</th>
                        <th className="px-3 py-2 text-right font-medium text-muted">{t('table.impr')}</th>
                        <th className="px-3 py-2 text-right font-medium text-muted">{t('table.clicks')}</th>
                        <th className="px-3 py-2 text-right font-medium text-muted">{t('table.ctr')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line bg-white">
                      {data.ads.length > 0 ? (
                        data.ads.map((ad) => (
                          <tr key={ad.id} className="hover:bg-slate-50 transition">
                            <td className="px-3 py-3">
                              <Link 
                                href={`/ads/${ad.id}?account_id=${selectedAccountId}`}
                                className="font-medium text-ink hover:underline"
                              >
                                {ad.name}
                              </Link>
                              <div className="text-xs text-muted mt-1">{ad.id}</div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <StatusBadge status={ad.status} />
                            </td>
                            <td className="px-3 py-3 text-right font-medium text-ink">
                              ${ad.metrics.spend.toFixed(2)}
                            </td>
                            <td className="px-3 py-3 text-right text-ink">
                              {new Intl.NumberFormat().format(ad.metrics.impressions)}
                            </td>
                            <td className="px-3 py-3 text-right text-ink">
                              {new Intl.NumberFormat().format(ad.metrics.clicks)}
                            </td>
                            <td className="px-3 py-3 text-right text-ink">
                              {ad.metrics.ctr.toFixed(2)}%
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-sm text-muted">
                            {t('table.noData' as any) || 'No ads found.'}
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
