import { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getCampaignsList, getSession } from '../../lib/api';
import { CampaignListItem } from '../../lib/types';
import { Sidebar } from '../../components/Sidebar';
import { AccountSwitcher } from '../../components/AccountSwitcher';
import { StatusBadge } from '../../components/StatusBadge';
import { SearchFilter } from '../../components/SearchFilter';
import { useLanguage } from '../../components/LanguageProvider';
import { useAccount } from '../../components/AccountProvider';
import { DateRangePicker, type DateRange } from '../../components/DateRangePicker';

export default function CampaignsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { selectedAccountId, isLoading: accountsLoading } = useAccount();
  
  const [sessionLoading, setSessionLoading] = useState(true);
  const [data, setData] = useState<CampaignListItem[]>([]);
  const [range, setRange] = useState<DateRange>({ from: daysAgo(30), to: today() });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);

  function daysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days + 1);
    return d.toISOString().split('T')[0];
  }
  
  function today(): string {
    return new Date().toISOString().split('T')[0];
  }

  const dateFrom = range.from;
  const dateTo = range.to;

  useEffect(() => {
    getSession().then((res) => {
      if (!res.authenticated) {
        router.push('/login');
        return;
      }
      setSessionLoading(false);
    }).catch(() => {
      router.push('/login');
    });
  }, [router]);

  useEffect(() => {
    if (!selectedAccountId || accountsLoading) return;
    setIsLoading(true);
    getCampaignsList(selectedAccountId, dateFrom, dateTo)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setIsLoading(false));
  }, [selectedAccountId, dateFrom, dateTo, accountsLoading]);

  const filteredData = useMemo(() => {
    return data.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data, searchTerm, statusFilter]);

  const statusOptions = [
    { label: t('filter.allStatuses' as any) || 'All Statuses', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Paused', value: 'PAUSED' },
    { label: 'Archived', value: 'ARCHIVED' },
  ];

  if (sessionLoading || accountsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted">
        {t('state.loading')}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Head>
        <title>{t('nav.campaigns' as any) || 'Campaigns'} - Meta Analytics</title>
      </Head>

      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-4 px-4 py-6 md:grid-cols-[260px_1fr]">
        <Sidebar currentPath="/campaigns" />

        <main className="space-y-4">
          <header className="card flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-heading text-2xl font-semibold">{t('nav.campaigns' as any) || 'Campaigns'}</p>
            </div>
            
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <AccountSwitcher />
              <DateRangePicker value={range} onChange={setRange} />
            </div>
          </header>

          <section className="card p-5">
            <SearchFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              statusOptions={statusOptions}
              placeholder={t('search.placeholder' as any) || 'Search campaigns...'}
            />

            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted">{t('state.loading')}</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="min-w-full divide-y divide-line text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted">{t('table.campaign')}</th>
                      <th className="px-3 py-2 text-center font-medium text-muted">{t('table.status' as any) || 'Status'}</th>
                      <th className="px-3 py-2 text-right font-medium text-muted">{t('table.budget' as any) || 'Budget'}</th>
                      <th className="px-3 py-2 text-right font-medium text-muted">{t('table.spend')}</th>
                      <th className="px-3 py-2 text-right font-medium text-muted">{t('table.impr')}</th>
                      <th className="px-3 py-2 text-right font-medium text-muted">{t('table.clicks')}</th>
                      <th className="px-3 py-2 text-right font-medium text-muted">{t('table.ctr')}</th>
                      <th className="px-3 py-2 text-right font-medium text-muted">{t('table.cpc')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-white">
                    {filteredData.length > 0 ? (
                      filteredData.map((campaign) => (
                        <tr key={campaign.id} className="hover:bg-slate-50 transition">
                          <td className="px-3 py-3">
                            <Link 
                              href={`/campaigns/${campaign.id}?account_id=${selectedAccountId}`}
                              className="font-medium text-ink hover:underline"
                            >
                              {campaign.name}
                            </Link>
                            <div className="text-xs text-muted mt-1">{campaign.id} • {campaign.objective}</div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <StatusBadge status={campaign.status} />
                          </td>
                          <td className="px-3 py-3 text-right text-muted">
                            {campaign.daily_budget > 0 ? `$${campaign.daily_budget.toFixed(2)}/d` : '-'}
                          </td>
                          <td className="px-3 py-3 text-right font-medium text-ink">
                            ${campaign.metrics.spend.toFixed(2)}
                          </td>
                          <td className="px-3 py-3 text-right text-ink">
                            {new Intl.NumberFormat().format(campaign.metrics.impressions)}
                          </td>
                          <td className="px-3 py-3 text-right text-ink">
                            {new Intl.NumberFormat().format(campaign.metrics.clicks)}
                          </td>
                          <td className="px-3 py-3 text-right text-ink">
                            {campaign.metrics.ctr.toFixed(2)}%
                          </td>
                          <td className="px-3 py-3 text-right text-ink">
                            ${campaign.metrics.cpc.toFixed(4)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-sm text-muted">
                          {t('table.noData' as any) || 'No campaigns found.'}
                        </td>
                      </tr>
                    )}
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
