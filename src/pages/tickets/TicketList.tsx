import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, AlertCircle, Clock, Users, Tag, Edit, Trash2 } from 'lucide-react';
import axios from 'axios';
import type { Ticket } from '../../types/tickets';
import EditTicketForm from '../../components/tickets/EditTicketForm';

const priorityColors = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

const statusColors = {
  open: 'bg-green-100 text-green-800',
  'in-progress': 'bg-blue-100 text-blue-800',
  resolved: 'bg-purple-100 text-purple-800',
  closed: 'bg-gray-100 text-gray-800',
};

const typeColors = {
  bug: 'bg-red-100 text-red-800',
  feature: 'bg-purple-100 text-purple-800',
  support: 'bg-blue-100 text-blue-800',
  other: 'bg-gray-100 text-gray-800',
};

export default function TicketList() {
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('all');
  const [selectedType, setSelectedType] = React.useState<string>('all');
  const [selectedPriority, setSelectedPriority] = React.useState<string>('all');
  const [editingTicket, setEditingTicket] = React.useState<Ticket | null>(null);
  const [stats, setStats] = React.useState([
    { name: 'Tickets ouverts', value: '0', change: '0', changeType: 'neutral', icon: AlertCircle },
    { name: 'Temps moyen de résolution', value: '0 jours', change: '0%', changeType: 'neutral', icon: Clock },
    { name: 'Taux de résolution', value: '0%', change: '0%', changeType: 'neutral', icon: Users },
  ]);

  React.useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/tickets');
        setTickets(response.data);

        // Calculate stats
        const openTickets = response.data.filter((ticket: Ticket) => ticket.status === 'open').length;
        const resolvedTickets = response.data.filter((ticket: Ticket) => ticket.status === 'resolved').length;
        const totalTickets = response.data.length;

        // Calculate average resolution time
        const resolvedTicketsWithDates = response.data.filter((ticket: Ticket) => 
          ticket.status === 'resolved' && ticket.created_at && ticket.updated_at
        );
        const avgResolutionTime = resolvedTicketsWithDates.reduce((acc: number, ticket: Ticket) => {
          const created = new Date(ticket.created_at);
          const resolved = new Date(ticket.updated_at);
          return acc + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / (resolvedTicketsWithDates.length || 1);

        // Calculate resolution rate
        const resolutionRate = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;

        setStats([
          { 
            name: 'Tickets ouverts', 
            value: openTickets.toString(), 
            change: '',
            changeType: openTickets > 5 ? 'negative' : 'positive',
            icon: AlertCircle 
          },
          { 
            name: 'Temps moyen de résolution', 
            value: `${avgResolutionTime.toFixed(1)} jours`, 
            change: '',
            changeType: avgResolutionTime < 3 ? 'positive' : 'negative',
            icon: Clock 
          },
          { 
            name: 'Taux de résolution', 
            value: `${resolutionRate.toFixed(0)}%`, 
            change: '',
            changeType: resolutionRate > 80 ? 'positive' : 'negative',
            icon: Users 
          },
        ]);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching tickets:', error);
        setError('Une erreur est survenue lors du chargement des tickets');
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  const handleDeleteTicket = async (ticketId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce ticket ?')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:3000/api/tickets/${ticketId}`);
      setTickets(prev => prev.filter(ticket => ticket.id !== ticketId));
    } catch (error) {
      console.error('Error deleting ticket:', error);
      setError('Une erreur est survenue lors de la suppression du ticket');
    }
  };

  const handleUpdateTicket = (updatedTicket: Ticket) => {
    setTickets(prev =>
      prev.map(ticket =>
        ticket.id === updatedTicket.id ? updatedTicket : ticket
      )
    );
  };

  const filteredTickets = React.useMemo(() => {
    return tickets.filter(ticket => {
      const matchesSearch = 
        ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = selectedStatus === 'all' || ticket.status === selectedStatus;
      const matchesType = selectedType === 'all' || ticket.type === selectedType;
      const matchesPriority = selectedPriority === 'all' || ticket.priority === selectedPriority;
      
      return matchesSearch && matchesStatus && matchesType && matchesPriority;
    });
  }, [tickets, searchTerm, selectedStatus, selectedType, selectedPriority]);

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Chargement des tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Tickets</h1>
            <p className="mt-2 text-sm text-gray-700">
              Gérez vos tickets de support et suivez leur résolution
            </p>
          </div>
          <Link
            to="/tickets/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            Nouveau ticket
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6 sm:py-6"
          >
            <dt>
              <div className="absolute rounded-md bg-gray-50 p-3">
                <stat.icon className="h-6 w-6 text-gray-600" aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">{stat.name}</p>
            </dt>
            <dd className="ml-16 flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              <p
                className={`ml-2 flex items-baseline text-sm font-semibold ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {stat.change}
              </p>
            </dd>
          </div>
        ))}
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
              placeholder="Rechercher un ticket..."
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
              <option value="open">Ouvert</option>
              <option value="in-progress">En cours</option>
              <option value="resolved">Résolu</option>
              <option value="closed">Fermé</option>
            </select>

            <select
              className="rounded-lg border border-gray-300 py-2 hover:border-gray-400"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="all">Tous les types</option>
              <option value="bug">Bug</option>
              <option value="feature">Fonctionnalité</option>
              <option value="support">Support</option>
              <option value="other">Autre</option>
            </select>

            <select
              className="rounded-lg border border-gray-300 py-2 hover:border-gray-400"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
            >
              <option value="all">Toutes les priorités</option>
              <option value="low">Basse</option>
              <option value="medium">Moyenne</option>
              <option value="high">Haute</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ticket
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priorité
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigné à
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredTickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div>
                      <div className="font-medium text-gray-900">{ticket.title}</div>
                      <div className="text-sm text-gray-500">{ticket.description}</div>
                      {ticket.tags && ticket.tags.length > 0 && (
                        <div className="mt-1 flex items-center gap-2">
                          <Tag className="h-4 w-4 text-gray-400" />
                          <div className="flex gap-1">
                            {ticket.tags.map(tag => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${typeColors[ticket.type]}`}>
                    {ticket.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${priorityColors[ticket.priority]}`}>
                    {ticket.priority}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${statusColors[ticket.status]}`}>
                    {ticket.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {ticket.assignee || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(ticket.created_at).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    {/* <Link
                      to={`/tickets/${ticket.id}/edit`}
                      className="text-gray-400 hover:text-blue-500"
                    >
                      <Edit className="h-5 w-5" />
                    </Link> */}
                    <button
                        onClick={() => setEditingTicket(ticket)}
                        className="text-gray-400 hover:text-blue-500"
                        title="Modifier"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                    <button
                      onClick={() => handleDeleteTicket(ticket.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editingTicket && (
        <EditTicketForm
          ticket={editingTicket}
          isOpen={true}
          onClose={() => setEditingTicket(null)}
          onUpdate={handleUpdateTicket}
        />
      )}
    </div>
  );
}