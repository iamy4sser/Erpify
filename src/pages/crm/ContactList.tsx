import React from 'react';
import { Mail, Phone, Search, Plus, MoreVertical, Star, StarOff, Filter, Edit, Trash2 } from 'lucide-react';
import axios from 'axios';
import ContactDetails from '../../components/crm/ContactDetails';
import NewContactForm from '../../components/crm/NewContactForm';
import EditContactForm from '../../components/crm/EditContactForm';
import type { Contact } from '../../types/crm';

const statusColors = {
  supplier: 'bg-yellow-100 text-yellow-800',
  customer: 'bg-green-100 text-green-800',
  prospect: 'bg-blue-100 text-blue-800',
};

const statusLabels = {
  prospect: 'Prospect',
  customer: 'Client',
  supplier: 'Fournisseur',
};

export default function ContactList() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('all');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedContact, setSelectedContact] = React.useState<Contact | null>(null);
  const [isNewContactFormOpen, setIsNewContactFormOpen] = React.useState(false);
  const [contactsList, setContactsList] = React.useState<Contact[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<'name' | 'company' | 'lastContact'>('lastContact');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  const [editingContact, setEditingContact] = React.useState<Contact | null>(null);

  React.useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get('http://localhost:3000/api/contacts');
        setContactsList(response.data);
      } catch (error) {
        console.error('Error fetching contacts:', error);
        setError('Une erreur est survenue lors du chargement des contacts');
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, []);

  const filteredContacts = React.useMemo(() => {
    return contactsList
      .filter(contact => {
        const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           contact.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           contact.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = selectedStatus === 'all' || contact.status === selectedStatus;
        const matchesFavorite = !showFavoritesOnly || contact.favorite;
        return matchesSearch && matchesStatus && matchesFavorite;
      })
      .sort((a, b) => {
        if (sortBy === 'lastContact') {
          return sortOrder === 'desc' 
            ? new Date(b.lastContact).getTime() - new Date(a.lastContact).getTime()
            : new Date(a.lastContact).getTime() - new Date(b.lastContact).getTime();
        }
        const aValue = a[sortBy].toLowerCase();
        const bValue = b[sortBy].toLowerCase();
        return sortOrder === 'desc' 
          ? bValue.localeCompare(aValue)
          : aValue.localeCompare(bValue);
      });
  }, [contactsList, searchTerm, selectedStatus, showFavoritesOnly, sortBy, sortOrder]);

  const handleNewContact = (contact: Omit<Contact, 'id' | 'lastContact'>) => {
    const newContact: Contact = {
      ...contact,
      id: crypto.randomUUID(),
      lastContact: new Date().toISOString().split('T')[0],
    };
    setContactsList(prev => [...prev, newContact]);
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce contact ?')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:3000/api/contacts/${contactId}`);
      setContactsList(prev => prev.filter(contact => contact.id !== contactId));
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Une erreur est survenue lors de la suppression du contact');
    }
  };

  const handleToggleFavorite = (contactId: string) => {
    setContactsList(prev =>
      prev.map(contact =>
        contact.id === contactId
          ? { ...contact, favorite: !contact.favorite }
          : contact
      )
    );
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="h-full bg-gray-50">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Contacts</h1>
        <p className="mt-2 text-sm text-gray-700">
          Gérez vos fournisseurs, prospects et clients
        </p>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un contact..."
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
              <option value="prospect">Prospects</option>
              <option value="customer">Clients</option>
              <option value="supplier">Fournisseurs</option>
            </select>

            <button 
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
              onClick={() => setIsNewContactFormOpen(true)}
            >
              <Plus className="h-5 w-5" />
              <span>Nouveau contact</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => setShowFavoritesOnly(prev => !prev)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
              showFavoritesOnly
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Star className={`h-4 w-4 ${showFavoritesOnly ? 'fill-yellow-500' : ''}`} />
            Favoris uniquement
          </button>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-700">Trier par:</span>
            <button
              onClick={() => handleSort('name')}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                sortBy === 'name'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Nom {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => handleSort('company')}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                sortBy === 'company'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Entreprise {sortBy === 'company' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => handleSort('lastContact')}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                sortBy === 'lastContact'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Dernier contact {sortBy === 'lastContact' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {loading && (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500">Chargement des contacts...</p>
          </div>
        )}

        {error && (
          <div className="p-8">
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          </div>
        )}

        {!loading && !error && (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dernier contact
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredContacts.map((contact) => (
              <tr 
                key={contact.id} 
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedContact(contact)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <button 
                      className="mr-4 text-gray-400 hover:text-yellow-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(contact.id);
                      }}
                    >
                      {contact.favorite ? (
                        <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                      ) : (
                        <StarOff className="h-5 w-5" />
                      )}
                    </button>
                    <div>
                      <div className="font-medium text-gray-900">{contact.name}</div>
                      <div className="text-sm text-gray-500">{contact.company}</div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {contact.email}
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {contact.phone}
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${statusColors[contact.status]}`}>
                    {statusLabels[contact.status]}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(contact.lastContact).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  <button 
                    className="text-gray-400 hover:text-blue-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingContact(contact);
                    }}
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button 
                    className="text-gray-400 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteContact(contact.id);
                    }}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>

      <ContactDetails
        contact={selectedContact}
        isOpen={selectedContact !== null}
        onClose={() => setSelectedContact(null)}
        onUpdateContact={(updatedContact) => {
          setContactsList(prev =>
            prev.map(contact =>
              contact.id === updatedContact.id ? updatedContact : contact
            )
          );
        }}
      />

      <NewContactForm
        isOpen={isNewContactFormOpen}
        onClose={() => setIsNewContactFormOpen(false)}
        onSubmit={handleNewContact}
      />

      {editingContact && (
        <EditContactForm
          contact={editingContact}
          isOpen={true}
          onClose={() => setEditingContact(null)}
          onUpdate={(updatedContact) => {
            setContactsList(prev =>
              prev.map(contact =>
                contact.id === updatedContact.id ? updatedContact : contact
              )
            );
            setEditingContact(null);
          }}
        />
      )}
    </div>
  );
}
