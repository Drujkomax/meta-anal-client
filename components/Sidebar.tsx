import Link from 'next/link';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useLanguage } from './LanguageProvider';
import { useAccount } from './AccountProvider';
import { TranslationKey } from '../lib/translations';

export interface SidebarProps {
  currentPath?: string;
}

export function Sidebar({ currentPath = '/dashboard' }: SidebarProps) {
  const { t } = useLanguage();
  const { selectedAccountId } = useAccount();

  const navigation: { label: TranslationKey; href: string }[] = [
    { label: 'nav.dashboard', href: '/dashboard' },
    { label: 'nav.campaigns', href: '/campaigns' },
    { label: 'nav.adAccounts', href: '/dashboard#accounts' },
    { label: 'nav.adsInsights', href: '/dashboard#ads' },
  ];

  return (
    <aside className="card h-fit w-full p-5 lg:sticky lg:top-6 lg:w-64">
      <div className="mb-8">
        <p className="font-heading text-xs uppercase tracking-[0.24em] text-muted">
          {t('nav.metaSuite')}
        </p>
        <h1 className="mt-2 font-heading text-xl font-semibold">{t('nav.console')}</h1>
      </div>

      <nav className="space-y-2">
        {navigation.map((item, index) => {
          const isActive = currentPath === item.href || (currentPath.startsWith(item.href) && item.href !== '/dashboard' && item.href.startsWith('/'));
          
          // Append account_id to the query
          const hrefWithAccount = selectedAccountId 
            ? `${item.href}${item.href.includes('?') ? '&' : '?'}account_id=${selectedAccountId}`
            : item.href;

          return (
            <Link
              key={item.label}
              href={hrefWithAccount}
              className={`block rounded-xl px-3 py-2 text-sm transition ${
                isActive ? 'bg-accentSoft text-ink font-medium' : 'text-muted hover:bg-accentSoft hover:text-ink'
              }`}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              {t(item.label)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 border-t border-line pt-5">
        <LanguageSwitcher />
      </div>
    </aside>
  );
}
