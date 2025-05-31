import React from 'react';
import { Dialog } from '@headlessui/react';
import { X, Plus, Search } from 'lucide-react';
import axios from 'axios';
import type { Transaction, Account } from '../../types/finance';
import type { Contact } from '../../types/crm';

interface EditTransactionFormProps {
  transaction: Transaction;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (transaction: Transaction) => void;
}

export default function EditTransactionForm({ transaction, isOpen, onClose, onUpdate }: EditTransactionFormProps) {
  const [formData, setFormData] = React.useState({
    date: transaction.date.split('T')[0],
    documentNumber: transaction.documentNumber,
    invoiceNumber: transaction.invoiceNumber || '',
    reference: transaction.reference || '',
    description: transaction.description,
    dueDate: transaction.dueDate?.split('T')[0] || '',
    entries: transaction.entries.map(entry => ({
      ...entry,
      total: entry.debit + entry.credit
    }))
  });

  const [error, setError] = React.useState<string | null>(null);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [selectedAccount, setSelectedAccount] = React.useState<Account | null>(null);
  const [selectedContact, setSelectedContact] = React.useState<Contact | null>(null);
  const [showAccountSearch, setShowAccountSearch] = React.useState(false);
  const [showContactSearch, setShowContactSearch] = React.useState(false);
  const [accountSearchTerm, setAccountSearchTerm] = React.useState('');
  const [contactSearchTerm, setContactSearchTerm] = React.useState('');

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [accountsRes, contactsRes] = await Promise.all([
          axios.get('http://localhost:3000/api/accounts'),
          axios.get('http://localhost:3000/api/contacts')
        ]);
        setAccounts(accountsRes.data);
        setContacts(contactsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Une erreur est survenue lors du chargement des données');
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await axios.put(`http://localhost:3000/api/transactions/${transaction.id}`, formData);
      onUpdate(response.data);
      onClose();
    } catch (error) {
      console.error('Error updating transaction:', error);
      setError('Une erreur est survenue lors de la mise à jour de la transaction');
    }
  };

  const handleUpdateEntry = (index: number, updates: Partial<typeof formData.entries[0]>) => {
    setFormData(prev => {
      const newEntries = [...prev.entries];
      newEntries[index] = { ...newEntries[index], ...updates };
      return { ...prev, entries: newEntries };
    });
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Dialog.Panel className="mx-auto w-full max-w-4xl rounded-xl bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <Dialog.Title className="text-xl font-semibold text-gray-900">
                Modifier la transaction
              </Dialog.Title>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                      Date
                    </label>
                    <input
                      type="date"
                      id="date"
                      required
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="documentNumber" className="block text-sm font-medium text-gray-700">
                      Compte BNQ
                    </label>
                    <select
                      id="documentNumber"
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      value={formData.documentNumber}
                      onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
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
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
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
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <input
                    type="text"
                    id="description"
                    required
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900">Écritures</h3>
                  <div className="mt-4">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Débit
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Crédit
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {formData.entries.map((entry, index) => (
                          <tr key={entry.id}>
                            <td className="px-6 py-4">
                              <input
                                type="text"
                                className="block w-full border-0 p-0 text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm"
                                value={entry.description || ''}
                                onChange={(e) => handleUpdateEntry(index, { description: e.target.value })}
                              />
                            </td>
                            <td className="px-6 py-4">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="block w-full border-0 p-0 text-right text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm"
                                value={entry.debit || ''}
                                onChange={(e) => handleUpdateEntry(index, { debit: Number(e.target.value), credit: 0 })}
                              />
                            </td>
                            <td className="px-6 py-4">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="block w-full border-0 p-0 text-right text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm"
                                value={entry.credit || ''}
                                onChange={(e) => handleUpdateEntry(index, { credit: Number(e.target.value), debit: 0 })}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                  >
                    Mettre à jour
                  </button>
                </div>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
}
