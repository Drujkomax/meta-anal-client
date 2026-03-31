import { useLanguage } from './LanguageProvider';
import { useAccount } from './AccountProvider';

export function AccountSwitcher() {
  const { t } = useLanguage();
  const { accounts, selectedAccountId, setSelectedAccountId } = useAccount();

  if (accounts.length === 0) return null;

  return (
    <label className="flex w-full max-w-sm items-center gap-3 rounded-xl border border-line bg-panel px-3 py-2 text-sm">
      <span className="font-medium text-muted">{t('switcher.label')}</span>
      <select
        className="w-full rounded-lg border border-line bg-white px-2 py-2 text-sm text-ink outline-none ring-accent transition focus:ring-2"
        value={selectedAccountId || ''}
        onChange={(event) => setSelectedAccountId(event.target.value)}
      >
        {Object.entries(
          accounts.reduce((groups, account) => {
            const groupName = account.business_name || account.identity_name || 'Accounts';
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(account);
            return groups;
          }, {} as Record<string, typeof accounts>)
        ).map(([groupName, groupAccounts]) => (
          <optgroup key={groupName} label={groupName}>
            {groupAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
