import React from 'react';
import { Dialog } from '@headlessui/react';
import { 
  X, Mail, Phone, MapPin, Building, Calendar, 
  PhoneCall, MessageSquare, Users, FileText 
} from 'lucide-react';
import NewInteractionForm from './NewInteractionForm';
import NewOpportunityForm from './NewOpportunityForm';
import type { Contact, Interaction, Opportunity } from '../../types/crm';

interface ContactDetailsProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateContact: (contact: Contact) => void;
}

export default function ContactDetails({ contact, isOpen, onClose, onUpdateContact }: ContactDetailsProps) {
  const [activeTab, setActiveTab] = React.useState<'details' | 'interactions' | 'opportunities'>('details');
  const [interactions, setInteractions] = React.useState<Interaction[]>([]);
  const [opportunities, setOpportunities] = React.useState<Opportunity[]>([]);
  const [isNewInteractionFormOpen, setIsNewInteractionFormOpen] = React.useState(false);
  const [isNewOpportunityFormOpen, setIsNewOpportunityFormOpen] = React.useState(false);

  React.useEffect(() => {
    if (contact) {
      // In a real app, we would fetch these from the API
      setInteractions([
        {
          id: '1',
          type: 'call',
          date: '2024-03-15T10:30:00',
          summary: 'Appel de suivi concernant la proposition commerciale',
          contactId: contact.id,
          userId: 'user1',
        },
        {
          id: '2',
          type: 'email',
          date: '2024-03-14T15:45:00',
          summary: 'Envoi du devis mis à jour',
          contactId: contact.id,
          userId: 'user1',
        },
      ]);

      setOpportunities([
        {
          id: '1',
          title: 'Projet ERP',
          value: 25000,
          status: 'proposal',
          probability: 60,
          expectedCloseDate: '2024-04-15',
          contactId: contact.id,
        },
      ]);
    }
  }, [contact]);

  const handleNewInteraction = (interaction: Omit<Interaction, 'id' | 'userId'>) => {
    const newInteraction: Interaction = {
      ...interaction,
      id: crypto.randomUUID(),
      userId: 'user1', // In a real app, this would come from the authenticated user
    };
    setInteractions(prev => [...prev, newInteraction]);
    
    // Update last contact date
    if (contact) {
      onUpdateContact({
        ...contact,
        lastContact: interaction.date,
      });
    }
  };

  const handleNewOpportunity = (opportunity: Omit<Opportunity, 'id'>) => {
    const newOpportunity: Opportunity = {
      ...opportunity,
      id: crypto.randomUUID(),
    };
    setOpportunities(prev => [...prev, newOpportunity]);
  };

  if (!contact) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Dialog.Panel className="mx-auto w-full max-w-4xl rounded-xl bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <Dialog.Title className="text-xl font-semibold text-gray-900">
                {contact.name}
              </Dialog.Title>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex border-b border-gray-200">
              <button
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'details'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('details')}
              >
                Détails
              </button>
              <button
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'interactions'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('interactions')}
              >
                Interactions
              </button>
              <button
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'opportunities'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('opportunities')}
              >
                Opportunités
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'details' && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Informations de contact</h3>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-900">
                          <Mail className="h-4 w-4 text-gray-400" />
                          {contact.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-900">
                          <Phone className="h-4 w-4 text-gray-400" />
                          {contact.phone}
                        </div>
                        {contact.address && (
                          <div className="flex items-center gap-2 text-sm text-gray-900">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            {contact.address}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Entreprise</h3>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-900">
                          <Building className="h-4 w-4 text-gray-400" />
                          {contact.company}
                        </div>
                      </div>
                    </div>

                    {contact.notes && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                        <p className="mt-2 text-sm text-gray-900">{contact.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Actions rapides</h3>
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <button className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                          <PhoneCall className="h-4 w-4" />
                          Appeler
                        </button>
                        <button className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                          <MessageSquare className="h-4 w-4" />
                          Email
                        </button>
                        <button className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                          <Users className="h-4 w-4" />
                          Réunion
                        </button>
                        <button className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                          <FileText className="h-4 w-4" />
                          Note
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'interactions' && (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Historique des interactions</h3>
                    <button 
                      className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                      onClick={() => setIsNewInteractionFormOpen(true)}
                    >
                      Nouvelle interaction
                    </button>
                  </div>
                  <div className="space-y-4">
                    {interactions.map((interaction) => (
                      <div
                        key={interaction.id}
                        className="rounded-lg border border-gray-200 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {interaction.type === 'call' && <PhoneCall className="h-4 w-4 text-blue-500" />}
                            {interaction.type === 'email' && <Mail className="h-4 w-4 text-green-500" />}
                            <span className="font-medium text-gray-900">
                              {interaction.type === 'call' ? 'Appel' : 'Email'}
                            </span>
                          </div>
                          <time className="text-sm text-gray-500">
                            {new Date(interaction.date).toLocaleDateString('fr-FR')}
                          </time>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">{interaction.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'opportunities' && (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Opportunités</h3>
                    <button 
                      className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                      onClick={() => setIsNewOpportunityFormOpen(true)}
                    >
                      Nouvelle opportunité
                    </button>
                  </div>
                  <div className="space-y-4">
                    {opportunities.map((opportunity) => (
                      <div
                        key={opportunity.id}
                        className="rounded-lg border border-gray-200 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">{opportunity.title}</h4>
                          <span className="text-lg font-semibold text-gray-900">
                            {opportunity.value.toLocaleString('fr-FR', {
                              style: 'currency',
                              currency: 'EUR',
                            })}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-500">
                              Clôture prévue : {new Date(opportunity.expectedCloseDate).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          <span className="font-medium text-gray-500">
                            Probabilité : {opportunity.probability}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Dialog.Panel>
        </div>
      </div>

      {contact && (
        <>
          <NewInteractionForm
            isOpen={isNewInteractionFormOpen}
            onClose={() => setIsNewInteractionFormOpen(false)}
            contactId={contact.id}
            onSubmit={handleNewInteraction}
          />

          <NewOpportunityForm
            isOpen={isNewOpportunityFormOpen}
            onClose={() => setIsNewOpportunityFormOpen(false)}
            contactId={contact.id}
            onSubmit={handleNewOpportunity}
          />
        </>
      )}
    </Dialog>
  );
}