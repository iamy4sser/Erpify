import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { ticketSchema, type Ticket } from '../../types/tickets';

export default function NewTicket() {
  const navigate = useNavigate();
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    type: 'bug' as Ticket['type'],
    priority: 'medium' as Ticket['priority'],
    status: 'open' as Ticket['status'],
    assignee: '',
    reporter: 'current-user', // In a real app, this would come from auth context
    due_date: '',
    tags: [] as string[],
  });

  const [error, setError] = React.useState<string | null>(null);
  const [newTag, setNewTag] = React.useState('');
  const [projects, setProjects] = React.useState<{ id: string; name: string }[]>([]);

  React.useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/projects');
        setProjects(response.data);
      } catch (error) {
        console.error('Error fetching projects:', error);
        setError('Une erreur est survenue lors du chargement des projets');
      }
    };

    fetchProjects();
  }, []);

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // Validate form data
      ticketSchema.parse(formData);

      const response = await axios.post('http://localhost:3000/api/tickets', formData, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('Ticket created:', response.data);
      navigate('/tickets');
    } catch (error) {
      console.error('Error creating ticket:', error);
      setError('Une erreur est survenue lors de la création du ticket');
    }
  };

  return (
    <div className="min-h-full bg-gray-50">
      <div className="mb-8">
        <button
          onClick={() => navigate('/tickets')}
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux tickets
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">Nouveau ticket</h1>
        <p className="mt-2 text-sm text-gray-700">
          Créez un nouveau ticket de support
        </p>
      </div>

      <div className="mx-auto max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="grid grid-cols-1 gap-6">
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

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  required
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                    Type
                  </label>
                  <select
                    id="type"
                    required
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as Ticket['type'] })}
                  >
                    <option value="bug">Bug</option>
                    <option value="feature">Fonctionnalité</option>
                    <option value="support">Support</option>
                    <option value="other">Autre</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                    Priorité
                  </label>
                  <select
                    id="priority"
                    required
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as Ticket['priority'] })}
                  >
                    <option value="low">Basse</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="assignee" className="block text-sm font-medium text-gray-700">
                    Projet
                  </label>
                  <select
                    id="assignee"
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={formData.assignee}
                    onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                  >
                    <option value="">Sélectionner un projet</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.name}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">
                    Date d'échéance
                  </label>
                  <input
                    type="date"
                    id="due_date"
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tags
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-gray-100 px-3 py-0.5 text-sm font-medium text-gray-800"
                    >
                      {tag}
                      <button
                        type="button"
                        className="ml-1.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-500 focus:bg-gray-500 focus:text-white focus:outline-none"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        <span className="sr-only">Supprimer le tag {tag}</span>
                        <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                          <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    placeholder="Ajouter un tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/tickets')}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Créer le ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}