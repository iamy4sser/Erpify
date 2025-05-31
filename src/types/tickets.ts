import { z } from 'zod';

export type TicketPriority = 'low' | 'medium' | 'high';
export type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'closed';
export type TicketType = 'bug' | 'feature' | 'support' | 'other';

export type Ticket = {
  id: string;
  title: string;
  description: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  assignee?: string;
  reporter: string;
  created_at: string;
  updated_at: string;
  due_date?: string;
  tags?: string[];
  attachments?: string[];
};

export const ticketSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  description: z.string().min(1, 'La description est requise'),
  type: z.enum(['bug', 'feature', 'support', 'other']),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['open', 'in-progress', 'resolved', 'closed']),
  assignee: z.string().optional(),
  reporter: z.string(),
  due_date: z.string().optional(),
  tags: z.array(z.string()).optional(),
  attachments: z.array(z.string()).optional(),
});

export type TicketComment = {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  attachments?: string[];
};

export const ticketCommentSchema = z.object({
  ticket_id: z.string(),
  user_id: z.string(),
  content: z.string().min(1, 'Le contenu est requis'),
  attachments: z.array(z.string()).optional(),
});