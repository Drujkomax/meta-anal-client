import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/router';
import { ConnectedAccount } from '../lib/types';
import { getAccounts } from '../lib/api';

interface AccountContextType {
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string) => void;
  accounts: ConnectedAccount[];
  isLoading: boolean;
  refreshAccounts: () => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

const STORAGE_KEY = 'meta_analitika_selected_account_id';

export function AccountProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [selectedAccountId, setSelectedAccountIdState] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const setSelectedAccountId = (id: string) => {
    setSelectedAccountIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
    
    // Also update URL if we want to synchronize, but for now we just persist
    // If we update the URL here, it might trigger a transition we don't want.
    // Better to let the Sidebar handle URL generation.
  };

  const fetchAccounts = useCallback(async () => {
    try {
      const data = await getAccounts();
      setAccounts(data);
      
      // Determine initial selection
      const queryId = router.query.account_id as string;
      const storedId = localStorage.getItem(STORAGE_KEY);
      
      if (queryId && data.some(a => a.id === queryId)) {
        setSelectedAccountIdState(queryId);
      } else if (storedId && data.some(a => a.id === storedId)) {
        setSelectedAccountIdState(storedId);
      } else if (data.length > 0) {
        setSelectedAccountIdState(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch accounts in AccountProvider:', error);
    } finally {
      setIsLoading(false);
    }
  }, [router.query.account_id]);

  useEffect(() => {
    // Only fetch if authenticated (we assume getAccounts handles auth check or fails silently)
    // We'll skip fetch on /login page to avoid unnecessary requests
    if (router.pathname === '/login') {
      setIsLoading(false);
      return;
    }
    
    fetchAccounts();
  }, [router.pathname, fetchAccounts]);

  // Sync with URL if it changes externally
  useEffect(() => {
    const queryId = router.query.account_id as string;
    if (queryId && queryId !== selectedAccountId && accounts.some(a => a.id === queryId)) {
      setSelectedAccountIdState(queryId);
      localStorage.setItem(STORAGE_KEY, queryId);
    }
  }, [router.query.account_id, accounts]);

  return (
    <AccountContext.Provider 
      value={{ 
        selectedAccountId, 
        setSelectedAccountId, 
        accounts, 
        isLoading, 
        refreshAccounts: fetchAccounts 
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}
