import { useState, useEffect } from 'react';
import { getAccounts, getAccountByNumber, createTransaction, type DolibarrAccount } from '../lib/db';

export function useAccounts() {
  const [accounts, setAccounts] = useState<DolibarrAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const data = await getAccounts();
        setAccounts(data);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch accounts'));
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  const getAccount = async (accountNumber: string) => {
    try {
      return await getAccountByNumber(accountNumber);
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to fetch account');
    }
  };

  return { accounts, loading, error, getAccount };
}

export function useTransactions() {
  const createNewTransaction = async (entries: Parameters<typeof createTransaction>[0]) => {
    try {
      await createTransaction(entries);
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create transaction');
    }
  };

  return { createNewTransaction };
}