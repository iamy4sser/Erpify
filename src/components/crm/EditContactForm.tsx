import React from 'react';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import axios from 'axios';
import type { Contact } from '../../types/crm';

interface EditContactFormProps {
  contact: Contact;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (contact: Contact) => void;
}

export default function EditContactForm({ contact, isOpen, onClose, onUpdate }: EditContactFormProps) {
  const [formData, setFormData] = React.useState({
    name: contact.name,
    company: contact.company,
    email: contact.email,
    phone: contact.phone,
    status: contact.status,
    address: contact.address || '',
    notes: contact.notes || '',
  });

  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setFormData({
      name: contact.name,
      company: contact.company,
      email: contact.email,
      phone: contact.phone,
      status: contact.status,
      address: contact.address || '',
      notes: contact.notes || '',
    });
  }, [contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await axios.put(`http://localhost:3000/api/contacts/${contact.id}`, formData, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.status === 200) {
        // Check if the response contains the updated contact
        if (response.data.dolibarr) {
          onUpdate(response.data.dolibarr);
        } else if (response.data.erp) {
          onUpdate(response.data.erp);
        } else {
          console.warn("No updated contact data in response:", response.data);
          setError('Contact mis à jour, mais impossible de récupérer les données.');
        }
        onClose();
      } else if (response.status === 404) {
          setError('Contact non trouvé.');
      } else {
        setError('Une erreur est survenue lors de la mise à jour du contact');
      }
    } catch (error : any) {
      console.error('Error updating contact:', error);
      setError(error.message || 'Une erreur est survenue lors de la mise à jour du contact');
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Dialog.Panel className="mx-auto w-full max-w-2xl rounded-xl bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <Dialog.Title className="text-xl font-semibold text-gray-900">
                Modifier le contact
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
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Nom complet
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
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                      Entreprise
                    </label>
                    <input
                      type="text"
                      id="company"
                      required
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      required
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Contact['status'] })}
                    >
                      <option value="prospect">Prospect</option>
                      <option value="customer">Client</option>
                      <option value="supplier">Fournisseur</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                      Adresse
                    </label>
                    <input
                      type="text"
                      id="address"
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
