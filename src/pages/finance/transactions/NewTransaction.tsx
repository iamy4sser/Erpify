import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Search, Calculator } from 'lucide-react';
import axios from 'axios';
import type { Journal, Account } from '../../../types/finance';
import type { Contact } from '../../../types/crm';
import JournalSelector from '../../../components/finance/JournalSelector';

interface TransactionEntry {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

export default function NewTransaction() {
  const navigate = useNavigate();
  const [selectedJournal, setSelectedJournal] = React.useState<Journal | null>(null);
  const [date, setDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [documentNumber, setDocumentNumber] = React.useState('');
  const [invoiceNumber, setInvoiceNumber] = React.useState('');
  const [reference, setReference] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [selectedAccount, setSelectedAccount] = React.useState<Account | null>(null);
  const [selectedContact, setSelectedContact] = React.useState<Contact | null>(null);
  const [showAccountSearch, setShowAccountSearch] = React.useState(false);
  const [showContactSearch, setShowContactSearch] = React.useState(false);
  const [accountSearchTerm, setAccountSearchTerm] = React.useState('');
  const [contactSearchTerm, setContactSearchTerm] = React.useState('');
  const [entries, setEntries] = React.useState<Omit<TransactionEntry, 'id'>[]>([
    {
      accountId: '',
      accountCode: '',
      accountName: '',
      debit: 0,
      credit: 0,
      description: '',
    },
    {
      accountId: '',
      accountCode: '',
      accountName: '',
      debit: 0,
      credit: 0,
      description: '',
    },
  ]);
  const [error, setError] = React.useState<string | null>(null);
  const [journals, setJournals] = React.useState<Journal[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [journalsRes, accountsRes, contactsRes] = await Promise.all([
          axios.get('http://localhost:3000/api/journals'),
          axios.get('http://localhost:3000/api/accounts'),
          axios.get('http://localhost:3000/api/contacts')
        ]);

        setJournals(journalsRes.data);
        setAccounts(accountsRes.data);
        setContacts(contactsRes.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Une erreur est survenue lors du chargement des données');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredAccounts = React.useMemo(() => {
    return accounts.filter(account =>
      account.code.toLowerCase().includes(accountSearchTerm.toLowerCase()) ||
      account.name.toLowerCase().includes(accountSearchTerm.toLowerCase())
    );
  }, [accounts, accountSearchTerm]);

  const filteredContacts = React.useMemo(() => {
    return contacts.filter(contact =>
      contact.name.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
      contact.company.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(contactSearchTerm.toLowerCase())
    );
  }, [contacts, contactSearchTerm]);

  // Automatically calculate totals when entries change
  const totals = React.useMemo(() => {
    return entries.reduce(
      (acc, entry) => ({
        debit: acc.debit + entry.debit,
        credit: acc.credit + entry.credit,
      }),
      { debit: 0, credit: 0 }
    );
  }, [entries]);

  const isBalanced = totals.debit === totals.credit;

  const handleAccountSelect = (index: number, accountCode: string) => {
    const account = accounts.find(a => a.code === accountCode);
    if (!account) return;

    setEntries(prev => prev.map((entry, i) => {
      if (i === index) {
        return {
          ...entry,
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
        };
      }
      return entry;
    }));
  };

  const handleEntryUpdate = (index: number, updates: Partial<TransactionEntry>) => {
    setEntries(prev => prev.map((entry, i) => {
      if (i === index) {
        // If updating debit, set credit to 0 and vice versa
        if ('debit' in updates && updates.debit > 0) {
          updates.credit = 0;
        } else if ('credit' in updates && updates.credit > 0) {
          updates.debit = 0;
        }
        return { ...entry, ...updates };
      }
      return entry;
    }));

    // Auto-balance the transaction if possible
    if (entries.length === 2) {
      const otherIndex = index === 0 ? 1 : 0;
      const updatedEntry = { ...entries[index], ...updates };
      
      if (updatedEntry.debit > 0) {
        setEntries(prev => prev.map((entry, i) => {
          if (i === otherIndex) {
            return { ...entry, debit: 0, credit: updatedEntry.debit };
          }
          return entry;
        }));
      } else if (updatedEntry.credit > 0) {
        setEntries(prev => prev.map((entry, i) => {
          if (i === otherIndex) {
            return { ...entry, credit: 0, debit: updatedEntry.credit };
          }
          return entry;
        }));
      }
    }
  };

  const handleAddEntry = () => {
    setEntries(prev => [
      ...prev,
      {
        accountId: '',
        accountCode: '',
        accountName: '',
        debit: 0,
        credit: 0,
        description: '',
      },
    ]);
  };

  const handleRemoveEntry = (index: number) => {
    setEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced || !selectedJournal || !selectedAccount || !selectedContact) return;
    setError(null);

    try {
      // Extract numeric IDs from string IDs
      const accountId = selectedAccount.id;
      const contactId = selectedContact.id;
      const journalId = selectedJournal.id;

      const response = await axios.post('http://localhost:3000/api/transactions', {
        date,
        journalId,
        documentNumber,
        invoiceNumber,
        reference,
        accountId,
        contactId,
        description,
        dueDate,
        entries: entries.map(entry => ({
          ...entry,
          debit: Number(entry.debit),
          credit: Number(entry.credit),
        })),
      });

      console.log('Transaction created:', response.data);
      navigate('/finance/transactions');
    } catch (error) {
      console.error('Error creating transaction:', error);
      setError('Une erreur est survenue lors de la création de l\'écriture');
    }
  };

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

  if (!selectedJournal) {
    return (
      <div className="min-h-full bg-gray-50">
        <div className="mb-8">
          <button
            onClick={() => navigate('/finance/transactions')}
            className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux écritures
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Nouvelle écriture</h1>
          <p className="mt-2 text-sm text-gray-700">
            Sélectionnez un journal pour commencer
          </p>
        </div>

        <JournalSelector
          journals={journals}
          selectedJournal={selectedJournal}
          onSelect={setSelectedJournal}
        />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50">
      <div className="mb-8">
        <button
          onClick={() => navigate('/finance/transactions')}
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux écritures
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">Nouvelle écriture</h1>
        <p className="mt-2 text-sm text-gray-700">
          Journal : {selectedJournal.name} ({selectedJournal.code})
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Header */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                type="date"
                id="date"
                required
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="documentNumber" className="block text-sm font-medium text-gray-700">
                Compte BNQ
              </label>
              <select
                id="documentNumber"
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value as 'CFG Bank' | 'Attijariwafa Bank' | 'CFG Devis')}
              >
                <option value="CFG Bank">CFG Bank</option>
                <option value="Attijariwafa Bank">Attijariwafa Bank</option>
                <option value="CFG Devis">CFG Devis</option>
              </select>
            </div>

            <div>
              <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700">
                N° facture
              </label>
              <input
                type="text"
                id="invoiceNumber"
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="reference" className="block text-sm font-medium text-gray-700">
                Référence
              </label>
              <input
                type="text"
                id="reference"
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
                Date d'échéance
              </label>
              <input
                type="date"
                id="dueDate"
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Libellé écriture
            </label>
            <input
              type="text"
              id="description"
              required
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Account selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Compte général
              </label>
              {selectedAccount ? (
                <div className="mt-1 flex items-center justify-between rounded-lg border border-gray-200 p-4">
                  <div>
                    <div className="font-medium text-gray-900">{selectedAccount.name}</div>
                    <div className="text-sm text-gray-500">{selectedAccount.code}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAccount(null)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="mt-1">
                  <button
                    type="button"
                    onClick={() => setShowAccountSearch(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Search className="h-5 w-5" />
                    Rechercher un compte
                  </button>

                  {showAccountSearch && (
                    <div className="mt-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Rechercher un compte..."
                          className="w-full rounded-lg border-gray-300 pl-10 pr-4 py-2 focus:border-primary-500 focus:ring-primary-500"
                          value={accountSearchTerm}
                          onChange={(e) => setAccountSearchTerm(e.target.value)}
                        />
                      </div>
                      
                      <ul className="mt-2 max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white">
                        {filteredAccounts.map(account => (
                          <li
                            key={account.id}
                            className="cursor-pointer border-b border-gray-200 p-4 hover:bg-gray-50"
                            onClick={() => {
                              setSelectedAccount(account);
                              setShowAccountSearch(false);
                              setAccountSearchTerm('');
                            }}
                          >
                            <div className="font-medium text-gray-900">{account.name}</div>
                            <div className="text-sm text-gray-500">{account.code}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Contact selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Compte tiers
              </label>
              {selectedContact ? (
                <div className="mt-1 flex items-center justify-between rounded-lg border border-gray-200 p-4">
                  <div>
                    <div className="font-medium text-gray-900">{selectedContact.name}</div>
                    <div className="text-sm text-gray-500">{selectedContact.company}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedContact(null)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="mt-1">
                  <button
                    type="button"
                    onClick={() => setShowContactSearch(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Search className="h-5 w-5" />
                    Rechercher un tiers
                  </button>

                  {showContactSearch && (
                    <div className="mt-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Rechercher un tiers..."
                          className="w-full rounded-lg border-gray-300 pl-10 pr-4 py-2 focus:border-primary-500 focus:ring-primary-500"
                          value={contactSearchTerm}
                          onChange={(e) => setContactSearchTerm(e.target.value)}
                        />
                      </div>
                      
                      <ul className="mt-2 max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white">
                        {filteredContacts.map(contact => (
                          <li
                            key={contact.id}
                            className="cursor-pointer border-b border-gray-200 p-4 hover:bg-gray-50"
                            onClick={() => {
                              setSelectedContact(contact);
                              setShowContactSearch(false);
                              setContactSearchTerm('');
                            }}
                          >
                            <div className="font-medium text-gray-900">{contact.name}</div>
                            <div className="text-sm text-gray-500">{contact.company}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Entries */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Lignes d'écriture</h2>
            <button
              type="button"
              onClick={handleAddEntry}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Plus className="h-5 w-5" />
              Ajouter une ligne
            </button>
          </div>

          <div className="mt-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th scope="col" className="py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Libellé
                  </th>
                  <th scope="col" className="py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Débit
                  </th>
                  <th scope="col" className="py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Crédit
                  </th>
                  <th scope="col" className="relative py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {entries.map((entry, index) => (
                  <tr key={index}>
                    <td className="py-4">
                      <input
                        type="text"
                        className="block w-full border-0 p-0 text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm"
                        value={entry.description}
                        onChange={(e) => handleEntryUpdate(index, { description: e.target.value })}
                      />
                    </td>
                    <td className="py-4">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="block w-full border-0 p-0 text-right text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm"
                        value={entry.debit || ''}
                        onChange={(e) => handleEntryUpdate(index, { 
                          debit: Number(e.target.value),
                          credit: 0,
                        })}
                      />
                    </td>
                    <td className="py-4">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="block w-full border-0 p-0 text-right text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm"
                        value={entry.credit || ''}
                        onChange={(e) => handleEntryUpdate(index, { 
                          credit: Number(e.target.value),
                          debit: 0,
                        })}
                      />
                    </td>
                    <td className="py-4 text-right">
                      {entries.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEntry(index)}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={2} className="pt-6 text-right text-sm font-normal text-gray-500">
                    Total
                  </th>
                  <td className="pt-6 text-right text-sm text-gray-900">
                    {totals.debit.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}
                  </td>
                  <td className="pt-6 text-right text-sm text-gray-900">
                    {totals.credit.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <th scope="row" colSpan={2} className="pt-4 text-right text-sm font-normal text-gray-500">
                    Différence
                  </th>
                  <td colSpan={2} className={`pt-4 text-right text-sm font-medium ${
                    isBalanced ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {Math.abs(totals.debit - totals.credit).toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/finance/transactions')}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!isBalanced || !selectedAccount || !selectedContact}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Calculator className="h-5 w-5" />
            Enregistrer l'écriture
          </button>
        </div>
      </form>
    </div>
  );
}