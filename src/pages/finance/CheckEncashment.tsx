import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, FileText, ArrowLeft, Check, X, AlertCircle, Calendar } from 'lucide-react';
import axios from 'axios';
import type { CheckEncashment, Currency } from '../../types/finance';
import type { Contact } from '../../types/crm';
import { checkEncashmentSchema } from '../../types/finance';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  deposited: 'bg-blue-100 text-blue-800',
  bounced: 'bg-red-100 text-red-800',
  cashed: 'bg-green-100 text-green-800',
};

const statusLabels = {
  pending: 'En attente',
  deposited: 'Déposé',
  bounced: 'Rejeté',
  cashed: 'Encaissé',
};

const currencies: Currency[] = ['MAD', 'EUR'];

const currencySymbols = {
  MAD: 'MAD',
  EUR: '€'
};

const bankOptions = [
  'BMCE Bank',
  'Attijariwafa Bank',
  'Banque Populaire',
  'CIH Bank',
  'CFG Bank',
  'Crédit Agricole du Maroc',
  'Crédit du Maroc',
  'Bank Al-Maghrib',
  'SGMB',
  'Bank of Africa',
  'Al Barid Bank',
  'Arab Bank',
  'Banco Sabadell',
  'UBCI',
  'Citibank Maghreb'
];

export default function CheckEncashmentPage() {
  const [checkEncashments, setCheckEncashments] = React.useState<CheckEncashment[]>([]);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('all');
  const [showForm, setShowForm] = React.useState(false);
  const [formData, setFormData] = React.useState({
    supplier_id: '',
    bank_name: '',
    due_date: '',
    amount: '',
    currency: 'MAD' as Currency,
    status: 'pending' as CheckEncashment['status'],
    check_number: '',
    comment: ''
  });

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [checkEncashmentsRes, contactsRes] = await Promise.all([
          axios.get('http://localhost:3000/api/check-encashments'),
          axios.get('http://localhost:3000/api/contacts')
        ]);

        setCheckEncashments(checkEncashmentsRes.data);
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

  const filteredCheckEncashments = React.useMemo(() => {
    return checkEncashments.filter(check => {
      const matchesSearch = 
        check.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        check.check_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        check.bank_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = selectedStatus === 'all' || check.status === selectedStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [checkEncashments, searchTerm, selectedStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const data = {
        ...formData,
        amount: parseFloat(formData.amount)
      };

      // Validate data
      checkEncashmentSchema.parse(data);

      const response = await axios.post('http://localhost:3000/api/check-encashments', data);
      
      setCheckEncashments(prev => [...prev, response.data]);
      setShowForm(false);
      setFormData({
        supplier_id: '',
        bank_name: '',
        due_date: '',
        amount: '',
        currency: 'MAD',
        status: 'pending',
        check_number: '',
        comment: ''
      });
    } catch (error) {
      console.error('Error creating check encashment:', error);
      setError('Une erreur est survenue lors de la création de l\'encaissement');
    }
  };

  const handleUpdateStatus = async (id: string, status: CheckEncashment['status']) => {
    try {
      const response = await axios.put(`http://localhost:3000/api/check-encashments/${id}/status`, {
        status
      });

      setCheckEncashments(prev => 
        prev.map(check => 
          check.id === id ? response.data : check
        )
      );
    } catch (error) {
      console.error('Error updating check encashment status:', error);
      setError('Une erreur est survenue lors de la mise à jour du statut');
    }
  };

  const handleDeposit = (id: string) => handleUpdateStatus(id, 'deposited');
  const handleCash = (id: string) => handleUpdateStatus(id, 'cashed');
  const handleBounce = (id: string) => handleUpdateStatus(id, 'bounced');

  const getDueDateStatus = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { type: 'late', message: `En retard de ${Math.abs(diffDays)} jour${Math.abs(diffDays) > 1 ? 's' : ''}` };
    } else if (diffDays <= 7) {
      return { type: 'soon', message: `Échéance dans ${diffDays} jour${diffDays > 1 ? 's' : ''}` };
    }
    return null;
  };

  const alerts = React.useMemo(() => {
    const today = new Date();
    const late = checkEncashments.filter(check => {
      const dueDate = new Date(check.due_date);
      return dueDate < today && check.status === 'pending';
    });

    const approaching = checkEncashments.filter(check => {
      const dueDate = new Date(check.due_date);
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 7 && check.status === 'pending';
    });

    return {
      late: late.length > 0 ? `${late.length} chèque${late.length > 1 ? 's' : ''} en retard` : null,
      approaching: approaching.length > 0 ? `${approaching.length} chèque${approaching.length > 1 ? 's' : ''} à échéance dans les 7 jours` : null
    };
  }, [checkEncashments]);

  const formatAmount = (amount: number, currency: Currency) => {
    if (currency === 'MAD') {
      return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' });
    } else {
      return `${amount.toLocaleString('fr-FR')} EUR`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Chargement des encaissements...</p>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Encaissement des chèques</h1>
            <p className="mt-2 text-sm text-gray-700">
              Gérez vos encaissements de chèques fournisseurs
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            Nouvel encaissement
          </button>
        </div>
      </div>

      {(alerts.late || alerts.approaching) && (
        <div className="mb-6 space-y-4">
          {alerts.late && (
            <div className="rounded-lg bg-red-50 p-4 flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
              <p className="text-sm text-red-700">{alerts.late}</p>
            </div>
          )}
          {alerts.approaching && (
            <div className="rounded-lg bg-yellow-50 p-4 flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-400 mr-3" />
              <p className="text-sm text-yellow-700">{alerts.approaching}</p>
            </div>
          )}
        </div>
      )}

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
              placeholder="Rechercher un encaissement..."
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
              <option value="pending">En attente</option>
              <option value="deposited">Déposés</option>
              <option value="bounced">Rejetés</option>
              <option value="cashed">Encaissés</option>
            </select>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Nouvel encaissement</h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="supplier_id" className="block text-sm font-medium text-gray-700">
                  Fournisseur
                </label>
                <select
                  id="supplier_id"
                  required
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                >
                  <option value="">Sélectionner un fournisseur</option>
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} - {contact.company}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="bank_name" className="block text-sm font-medium text-gray-700">
                  Banque
                </label>
                <select
                  id="bank_name"
                  required
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                >
                  <option value="">Sélectionner une banque</option>
                  {bankOptions.map(bank => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="check_number" className="block text-sm font-medium text-gray-700">
                  N° Chèque
                </label>
                <input
                  type="text"
                  id="check_number"
                  required
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={formData.check_number}
                  onChange={(e) => setFormData({ ...formData, check_number: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                  Montant
                </label>
                <div className="mt-1 flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      id="amount"
                      required
                      min="0"
                      step="0.01"
                      className="block w-full rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>
                  <select
                    className="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value as Currency })}
                  >
                    {currencies.map(currency => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">
                  Échéance
                </label>
                <input
                  type="date"
                  id="due_date"
                  required
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Statut
                </label>
                <select
                  id="status"
                  required
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as CheckEncashment['status'] })}
                >
                  <option value="pending">En attente</option>
                  <option value="deposited">Déposé</option>
                  <option value="bounced">Rejeté</option>
                  <option value="cashed">Encaissé</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
                  Commentaire
                </label>
                <textarea
                  id="comment"
                  rows={3}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
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
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fournisseur
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Banque
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                N° Chèque
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Montant
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Échéance
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
            {filteredCheckEncashments.map((check) => {
              const dueStatus = getDueDateStatus(check.due_date);
              
              return (
                <tr key={check.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{check.supplier_name}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {check.bank_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {check.check_number}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatAmount(check.amount, check.currency)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {new Date(check.due_date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      {dueStatus && (
                        <span className={`mt-1 text-xs ${
                          dueStatus.type === 'late' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {dueStatus.message}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${statusColors[check.status]}`}>
                      {statusLabels[check.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {check.status === 'pending' && (
                        <>
                          <button 
                            className="text-blue-600 hover:text-blue-900"
                            onClick={() => handleDeposit(check.id)}
                          >
                            Déposer
                          </button>
                          <button 
                            className="text-green-600 hover:text-green-900"
                            onClick={() => handleCash(check.id)}
                          >
                            Encaisser
                          </button>
                        </>
                      )}
                      {check.status === 'deposited' && (
                        <>
                          <button 
                            className="text-green-600 hover:text-green-900"
                            onClick={() => handleCash(check.id)}
                          >
                            Encaisser
                          </button>
                          <button 
                            className="text-red-600 hover:text-red-900"
                            onClick={() => handleBounce(check.id)}
                          >
                            Rejeter
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}