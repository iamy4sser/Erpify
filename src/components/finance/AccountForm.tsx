import React from 'react';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import axios from 'axios';

interface Account {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance: number;
  parent?: string;
}

interface AccountFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (account: Account) => void;
}

export default function AccountForm({ isOpen, onClose, onSubmit }: AccountFormProps) {
  const [formData, setFormData] = React.useState({
    code: '',
    name: '',
    type: 'asset' as Account['type'],
    balance: 0,
  });

  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await axios.post('http://localhost:3000/api/accounts', formData, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      onSubmit(response.data);
      onClose();
      setFormData({
        code: '',
        name: '',
        type: 'asset',
        balance: 0,
      });
    } catch (error) {
      console.error('Error creating account:', error);
      setError('Une erreur est survenue lors de la création du compte');
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Dialog.Panel className="mx-auto w-full max-w-md rounded-xl bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <Dialog.Title className="text-xl font-semibold text-gray-900">
                Nouveau compte
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
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                    Code du compte
                  </label>
                  <input
                    type="text"
                    id="code"
                    required
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Libellé
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                    Type
                  </label>
                  <select
                    id="type"
                    required
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as Account['type'] })}
                  >
                    <option value="asset">Actif</option>
                    <option value="liability">Passif</option>
                    <option value="equity">Capitaux propres</option>
                    <option value="revenue">Produits</option>
                    <option value="expense">Charges</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="balance" className="block text-sm font-medium text-gray-700">
                    Solde initial
                  </label>
                  <div className="mt-1 relative rounded-lg shadow-sm">
                    <input
                      type="number"
                      id="balance"
                      required
                      step="0.01"
                      className="block w-full rounded-lg border-gray-300 pl-3 pr-12 focus:border-primary-500 focus:ring-primary-500"
                      value={formData.balance}
                      onChange={(e) => setFormData({ ...formData, balance: Number(e.target.value) })}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-gray-500 sm:text-sm">€</span>
                    </div>
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
                    Créer le compte
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