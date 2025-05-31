export type Contact = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: 'supplier' | 'customer' | 'prospect';
  favorite: boolean;
  lastContact: string;
  address?: string;
  notes?: string;
  created_at: string;
};

export type Opportunity = {
  id: string;
  title: string;
  value: number;
  status: 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  probability: number;
  expectedCloseDate: string;
  contactId: string;
};

export type Interaction = {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'note';
  date: string;
  summary: string;
  contactId: string;
  userId: string;
};