import Head from 'next/head';
import { useEffect, useState } from 'react';
import { Dashboard } from '../components/Dashboard';
import { getMetaLoginUrlWithNext, getSession } from '../lib/api';
import { useLanguage } from '../components/LanguageProvider';
import { useAccount } from '../components/AccountProvider';
import { useRouter } from 'next/router';

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { accounts, isLoading: accountsLoading } = useAccount();
  const [sessionLoading, setSessionLoading] = useState(true);

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

  if (sessionLoading || accountsLoading) {
    return (
      <div className="p-10 text-center text-sm text-muted">{t('state.workspaceLoading')}</div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center sm:text-left">
        <div className="card p-6">
          <h1 className="font-heading text-2xl font-semibold">{t('state.noAccounts')}</h1>
          <p className="mt-2 text-sm text-muted">{t('state.noAccountsDesc')}</p>
          <a
            href={getMetaLoginUrlWithNext('/dashboard')}
            className="mt-5 inline-block rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {t('state.connectBtn')}
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>
          {t('nav.dashboard')} | {t('header.title')}
        </title>
      </Head>
      <Dashboard />
    </>
  );
}
