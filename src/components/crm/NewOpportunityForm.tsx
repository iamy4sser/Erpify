import React from 'react';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import type { Opportunity } from '../../types/crm';

interface NewOpportunityFormProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string;
  onSubmit: (opportunity: Omit<Opportunity, 'id'>) => void;
}

export default function NewOpportunityForm({ isOpen, onClose, contactId, onSubmit }: NewOpportunityFormProps) {
  const [formData, setFormData] = React.useState({
    title: '',
    value: 0,
    status: 'new' as Opportunity['status'],
    probability: 0,
    expectedCloseDate: '',
    contactId,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
    setFormData({
      title: '',
      value: 0,
      status: 'new',
      probability: 0,
      expectedCloseDate: '',
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
                Nouvelle opportunité
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
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Titre
                  </label>
                  <input
                    type="text"
                    id="title"
                    required
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="value" className="block text-sm font-medium text-gray-700">
                      Montant (€)
                    </label>
                    <input
                      type="number"
                      id="value"
                      min="0"
                      step="100"
                      required
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label htmlFor="probability" className="block text-sm font-medium text-gray-700">
                      Probabilité (%)
                    </label>
                    <input
                      type="number"
                      id="probability"
                      min="0"
                      max="100"
                      required
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      value={formData.probability}
                      onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                      Statut
                    </label>
                    <select
                      id="status"
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Opportunity['status'] })}
                    >
                      <option value="new">Nouveau</option>
                      <option value="qualified">Qualifié</option>
                      <option value="proposal">Proposition</option>
                      <option value="negotiation">Négociation</option>
                      <option value="won">Gagné</option>
                      <option value="lost">Perdu</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="expectedCloseDate" className="block text-sm font-medium text-gray-700">
                      Date de clôture prévue
                    </label>
                    <input
                      type="date"
                      id="expectedCloseDate"
                      required
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      value={formData.expectedCloseDate}
                      onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                    />
                  </div>
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
                    Créer l'opportunité
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