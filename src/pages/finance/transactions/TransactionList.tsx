import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, FileText, Edit, Trash2, ArrowUpRight, ArrowDownRight, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import type { Transaction, Journal } from '../../../types/finance';
import TransactionFilters from '../../../components/finance/TransactionFilters';
import EditTransactionForm from '../../../components/finance/EditTransactionForm';

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  posted: 'bg-blue-100 text-blue-800',
  reconciled: 'bg-green-100 text-green-800',
};

const statusLabels = {
  draft: 'Brouillon',
  posted: 'Validée',
  reconciled: 'Rapprochée',
};

export default function TransactionList() {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [journals, setJournals] = React.useState<Journal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('all');
  const [selectedJournal, setSelectedJournal] = React.useState<string>('all');
  const [dateRange, setDateRange] = React.useState({
    start: '',
    end: '',
  });
  const [amountRange, setAmountRange] = React.useState({
    min: '',
    max: '',
  });
  const [showFilters, setShowFilters] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [transactionsRes, journalsRes] = await Promise.all([
          axios.get('http://localhost:3000/api/transactions', {
            params: {
              startDate: dateRange.start || undefined,
              endDate: dateRange.end || undefined,
              journalId: selectedJournal === 'all' ? undefined : selectedJournal,
              minAmount: amountRange.min || undefined,
              maxAmount: amountRange.max || undefined,
            }
          }),
          axios.get('http://localhost:3000/api/journals')
        ]);
        setTransactions(transactionsRes.data);
        setJournals(journalsRes.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        setError('Une erreur est survenue lors du chargement des écritures');
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange, selectedJournal, amountRange]);

  const filteredTransactions = React.useMemo(() => {
    return transactions.filter(transaction => {
      const matchesSearch = 
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.entries.some(entry => 
          entry.accountCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.accountName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      const matchesStatus = selectedStatus === 'all' || transaction.status === selectedStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [transactions, searchTerm, selectedStatus]);

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) {
      return;
    }
  
    try {
      await axios.delete(`http://localhost:3000/api/transactions/${transactionId}`);
      setTransactions(prev => prev.filter(transaction => transaction.id !== transactionId));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      setError('Une erreur est survenue lors de la suppression de la transaction');
    }
  };
  
  const handleUpdateTransaction = (updatedTransaction: Transaction) => {
    setTransactions(prev =>
      prev.map(transaction =>
        transaction.id === updatedTransaction.id ? updatedTransaction : transaction
      )
    );
  };

  const handleReset = () => {
    setDateRange({ start: '', end: '' });
    setSelectedJournal('all');
    setAmountRange({ min: '', max: '' });
  };

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Chargement des écritures...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50">
      <div className="mb-8">
        <Link
          to="/finance"
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500  hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la comptabilité
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Journal des écritures</h1>
            <p className="mt-2 text-sm text-gray-700">
              Consultez et gérez vos écritures comptables
            </p>
          </div>
          <Link
            to="/finance/transactions/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            Nouvelle écriture
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une écriture..."
              className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:border-primary-500 focus:ring-primary-500 hover:border-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4">
            <select
              className="rounded-lg border border-gray-300 py-2 hover:border-gray-400"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="draft">Brouillons</option>
              <option value="posted">Validées</option>
              <option value="reconciled">Rapprochées</option>
            </select>
          </div>
        </div>

        <TransactionFilters
          journals={journals}
          selectedJournal={selectedJournal}
          onJournalChange={setSelectedJournal}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          amountRange={amountRange}
          onAmountRangeChange={setAmountRange}
          onReset={handleReset}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
        />
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Aucune écriture</h3>
          <p className="mt-2 text-sm text-gray-500">
            Commencez par créer une nouvelle écriture comptable.
          </p>
          <div className="mt-6">
            <Link
              to="/finance/transactions/new"
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              <Plus className="h-5 w-5" />
              Nouvelle écriture
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Journal
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compte BNQ
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Débit
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Crédit
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredTransactions.map((transaction) => (
                <React.Fragment key={transaction.id}>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(transaction.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {transaction.journalCode}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {transaction.documentNumber}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      {transaction.entries.reduce((total, entry) => total + Number(entry.debit), 0).toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      {transaction.entries.reduce((total, entry) => total + Number(entry.credit), 0).toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}
                      {/* {transaction.total.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })} */}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${statusColors[transaction.status]}`}>
                        {statusLabels[transaction.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingTransaction(transaction)}
                          className="text-gray-400 hover:text-blue-500"
                          title="Modifier"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="text-gray-400 hover:text-red-500"
                          title="Supprimer"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {transaction.entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4 pl-12 text-sm text-gray-500">
                        {entry.accountCode} - {entry.accountName}
                        {entry.description && (
                          <div className="text-xs text-gray-400">{entry.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {entry.debit > 0 && (
                          <div className="flex items-center justify-end gap-1 text-sm text-gray-900">
                            <ArrowUpRight className="h-4 w-4 text-green-500" />
                            {entry.debit.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {entry.credit > 0 && (
                          <div className="flex items-center justify-end gap-1 text-sm text-gray-900">
                            <ArrowDownRight className="h-4 w-4 text-red-500" />
                            {entry.credit.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editingTransaction && (
        <EditTransactionForm
          transaction={editingTransaction}
          isOpen={true}
          onClose={() => setEditingTransaction(null)}
          onUpdate={handleUpdateTransaction}
        />
      )}
      
    </div>
  );
}