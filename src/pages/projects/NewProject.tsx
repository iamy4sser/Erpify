import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import axios from 'axios';
import type { Project } from '../../types/projects';
import type { Contact } from '../../types/crm';

export default function NewProject() {
  const navigate = useNavigate();
  const [formData, setFormData] = React.useState<Omit<Project, 'id' | 'progress' | 'spent' | 'client' > & { client_id: string }>({
    name: '',
    description: '',
    status: 'active',
    startDate: '',
    endDate: '',
    budget: 0,
    teamSize: 1,
    client_id: '',
  });

  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/contacts');
        setContacts(response.data);
      } catch (error) {
        console.error('Error fetching contacts:', error);
        setError('Une erreur est survenue lors du chargement des contacts');
      }
    };

    fetchContacts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await axios.post('http://localhost:3000/api/projects', {
        ...formData,
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('Project created:', response.data);
      navigate('/projects');
    } catch (error) {
      console.error('Error creating project:', error);
      setError('Une erreur est survenue lors de la création du projet');
    }
  };

  return (
    <div className="min-h-full bg-gray-50">
      <div className="mb-8">
        <button
          onClick={() => navigate('/projects')}
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux projets
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">Nouveau projet</h1>
        <p className="mt-2 text-sm text-gray-700">
          Créez un nouveau projet et définissez ses paramètres initiaux
        </p>
      </div>

      <div className="mx-auto max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Project Information */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-medium text-gray-900">Informations du projet</h2>
            <div className="mt-6 grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nom du projet
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
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Project['status'] })}
                >
                  <option value="active">En cours</option>
                  <option value="on-hold">En pause</option>
                </select>
              </div>
            </div>
          </div>

          {/* Client Information */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-medium text-gray-900">Client</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-1">
              <div>
                <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">
                  Nom du contact
                </label>
                <select
                  id="clientId"
                  required
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                >
                  <option value="">Sélectionner un contact</option>
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} - {contact.company}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-medium text-gray-900">Détails du projet</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                  Date de début
                </label>
                <input
                  type="date"
                  id="startDate"
                  required
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                  Date de fin prévue
                </label>
                <input
                  type="date"
                  id="endDate"
                  required
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="budget" className="block text-sm font-medium text-gray-700">
                  Budget
                </label>
                <div className="mt-1 relative rounded-lg shadow-sm">
                  <input
                    type="number"
                    id="budget"
                    required
                    min="0"
                    step="100"
                    className="block w-full rounded-lg border-gray-300 pl-3 pr-12 focus:border-primary-500 focus:ring-primary-500"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500 sm:text-sm">€</span>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="teamSize" className="block text-sm font-medium text-gray-700">
                  Taille de l'équipe
                </label>
                <input
                  type="number"
                  id="teamSize"
                  required
                  min="1"
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={formData.teamSize}
                  onChange={(e) => setFormData({ ...formData, teamSize: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Créer le projet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
