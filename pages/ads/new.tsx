import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getSession } from '../../lib/api';
import { Sidebar } from '../../components/Sidebar';
import { useLanguage } from '../../components/LanguageProvider';
import { useAccount } from '../../components/AccountProvider';
import { CreateAdWizard } from '../../components/ads/CreateAdWizard';

export default function NewAdPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isLoading } = useAccount();
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    getSession()
      .then((res) => {
        if (!res.authenticated) router.push('/login');
        else setSessionLoading(false);
      })
      .catch(() => router.push('/login'));
  }, [router]);

  if (sessionLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted">
        {t('state.loading')}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Head>
        <title>{t('ads.wizard.title')} - Meta Analytics</title>
      </Head>
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-4 px-4 py-6 md:grid-cols-[260px_1fr]">
        <Sidebar currentPath="/ads/new" />
        <main className="space-y-4">
          <header className="card p-5">
            <h2 className="font-heading text-2xl font-semibold">{t('ads.wizard.title')}</h2>
            <p className="mt-1 text-sm text-muted">{t('ads.note.paused')}</p>
          </header>
          <CreateAdWizard />
        </main>
      </div>
    </div>
  );
}
