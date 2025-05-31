import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Plus, FileText, Check, X, AlertCircle, Calendar } from 'lucide-react';
import axios from 'axios';
import type { Transaction } from '../../types/finance';

const statusColors = {
  unreconciled: 'bg-yellow-100 text-yellow-800',
  reconciled: 'bg-green-100 text-green-800',
  pending: 'bg-blue-100 text-blue-800',
};

const statusLabels = {
  unreconciled: 'Non rapproché',
  reconciled: 'Rapproché',
  pending: 'En attente',
};

export default function ReconciliationPage() {
  const [bankTransactions, setBankTransactions] = React.useState<Transaction[]>([]);
  const [accountingTransactions, setAccountingTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = React.useState({
    startDate: '',
    endDate: ''
  });
  const [bankBalance, setBankBalance] = React.useState(0);
  const [accountingBalance, setAccountingBalance] = React.useState(0);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [bankRes, accountingRes] = await Promise.all([
          axios.get('http://localhost:3000/api/transactions', {
            params: {
              journalId: 'BNQ',
              startDate: selectedPeriod.startDate || undefined,
              endDate: selectedPeriod.endDate || undefined
            }
          }),
          axios.get('http://localhost:3000/api/transactions', {
            params: {
              accountId: '512', // Compte bancaire
              startDate: selectedPeriod.startDate || undefined,
              endDate: selectedPeriod.endDate || undefined
            }
          })
        ]);

        setBankTransactions(bankRes.data);
        setAccountingTransactions(accountingRes.data);

        // Calculate balances
        const bankBal = bankRes.data.reduce((sum: number, tx: Transaction) => 
          sum + (tx.entries[0].debit - tx.entries[0].credit), 0);
        const accountingBal = accountingRes.data.reduce((sum: number, tx: Transaction) => 
          sum + (tx.entries[0].debit - tx.entries[0].credit), 0);

        setBankBalance(bankBal);
        setAccountingBalance(accountingBal);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Une erreur est survenue lors du chargement des données');
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedPeriod]);

  const handleReconcile = async (bankTxId: string, accountingTxId: string) => {
    try {
      await axios.post('http://localhost:3000/api/transactions/reconcile', {
        bankTransactionId: bankTxId,
        accountingTransactionId: accountingTxId
      });

      // Update transaction statuses
      setBankTransactions(prev => 
        prev.map(tx => 
          tx.id === bankTxId ? { ...tx, status: 'reconciled' } : tx
        )
      );
      setAccountingTransactions(prev => 
        prev.map(tx => 
          tx.id === accountingTxId ? { ...tx, status: 'reconciled' } : tx
        )
      );
    } catch (error) {
      console.error('Error reconciling transactions:', error);
      setError('Une erreur est survenue lors du rapprochement');
    }
  };

  const filteredBankTransactions = React.useMemo(() => {
    return bankTransactions.filter(tx => {
      const matchesSearch = 
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.reference?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = selectedStatus === 'all' || tx.status === selectedStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [bankTransactions, searchTerm, selectedStatus]);

  const filteredAccountingTransactions = React.useMemo(() => {
    return accountingTransactions.filter(tx => {
      const matchesSearch = 
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.reference?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = selectedStatus === 'all' || tx.status === selectedStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [accountingTransactions, searchTerm, selectedStatus]);

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50">
      <div className="mb-8">
        <Link
          to="/finance"
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la comptabilité
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">Rapprochement bancaire</h1>
        <p className="mt-2 text-sm text-gray-700">
          Rapprochez vos écritures comptables avec vos relevés bancaires
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Solde bancaire</h3>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {bankBalance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Solde comptable</h3>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {accountingBalance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Écart</h3>
          <p className={`mt-2 text-2xl font-semibold ${
            bankBalance === accountingBalance ? 'text-green-600' : 'text-red-600'
          }`}>
            {Math.abs(bankBalance - accountingBalance).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une écriture..."
              className="w-full rounded-lg border-gray-300 pl-10 pr-4 py-2 focus:border-primary-500 focus:ring-primary-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4">
            <select
              className="rounded-lg border-gray-300 py-2"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="unreconciled">Non rapprochés</option>
              <option value="reconciled">Rapprochés</option>
              <option value="pending">En attente</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
              Date début
            </label>
            <input
              type="date"
              id="startDate"
              className="mt-1 block rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              value={selectedPeriod.startDate}
              onChange={(e) => setSelectedPeriod(prev => ({ ...prev, startDate: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
              Date fin
            </label>
            <input
              type="date"
              id="endDate"
              className="mt-1 block rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              value={selectedPeriod.endDate}
              onChange={(e) => setSelectedPeriod(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Bank Transactions */}
        <div>
          <h2 className="mb-4 text-lg font-medium text-gray-900">Relevé bancaire</h2>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredBankTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(tx.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{tx.description}</div>
                      {tx.reference && (
                        <div className="text-sm text-gray-500">{tx.reference}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <span className={tx.entries[0].debit > 0 ? 'text-green-600' : 'text-red-600'}>
                        {(tx.entries[0].debit || tx.entries[0].credit).toLocaleString('fr-FR', { 
                          style: 'currency', 
                          currency: 'EUR' 
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        statusColors[tx.status as keyof typeof statusColors]
                      }`}>
                        {statusLabels[tx.status as keyof typeof statusLabels]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Accounting Transactions */}
        <div>
          <h2 className="mb-4 text-lg font-medium text-gray-900">Écritures comptables</h2>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredAccountingTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(tx.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{tx.description}</div>
                      {tx.reference && (
                        <div className="text-sm text-gray-500">{tx.reference}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <span className={tx.entries[0].debit > 0 ? 'text-green-600' : 'text-red-600'}>
                        {(tx.entries[0].debit || tx.entries[0].credit).toLocaleString('fr-FR', { 
                          style: 'currency', 
                          currency: 'EUR' 
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        statusColors[tx.status as keyof typeof statusColors]
                      }`}>
                        {statusLabels[tx.status as keyof typeof statusLabels]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}