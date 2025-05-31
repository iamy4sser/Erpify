import React from 'react';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import type { Interaction } from '../../types/crm';

interface NewInteractionFormProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string;
  onSubmit: (interaction: Omit<Interaction, 'id' | 'userId'>) => void;
}

export default function NewInteractionForm({ isOpen, onClose, contactId, onSubmit }: NewInteractionFormProps) {
  const [formData, setFormData] = React.useState({
    type: 'call' as Interaction['type'],
    date: new Date().toISOString().split('T')[0],
    summary: '',
    contactId,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
    setFormData({
      type: 'call',
      date: new Date().toISOString().split('T')[0],
      summary: '',
      contactId,
    });
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[100]">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Dialog.Panel className="mx-auto w-full max-w-2xl rounded-xl bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <Dialog.Title className="text-xl font-semibold text-gray-900">
                Nouvelle interaction
              </Dialog.Title>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                      Type d'interaction
                    </label>
                    <select
                      id="type"
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as Interaction['type'] })}
                    >
                      <option value="call">Appel</option>
                      <option value="email">Email</option>
                      <option value="meeting">Réunion</option>
                      <option value="note">Note</option>
                    </select>
                  </div>

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
                </div>

                <div>
                  <label htmlFor="summary" className="block text-sm font-medium text-gray-700">
                    Résumé
                  </label>
                  <textarea
                    id="summary"
                    required
                    rows={4}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-end gap-4">
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
                    Enregistrer
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