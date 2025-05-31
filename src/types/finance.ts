import { z } from 'zod';

export type JournalType = 'purchase' | 'sale' | 'bank' | 'other';

export type Journal = {
  id: string;
  code: string;
  name: string;
  type: JournalType;
};

export type Account = {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance: number;
  parent?: string;
};

export type Transaction = {
  id: string;
  date: string;
  journalId: string;
  journalCode: string;
  journalName: string;
  documentNumber: string;
  invoiceNumber?: string;
  reference?: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  contactId?: string;
  contactName?: string;
  description: string;
  dueDate?: string;
  entries: TransactionEntry[];
  status: 'draft' | 'posted' | 'reconciled';
  total: number;
};

export type TransactionEntry = {
  id: string;
  debit: number;
  credit: number;
  description?: string;
};

export type TransactionFilters = {
  startDate?: string;
  endDate?: string;
  accountId?: string;
  journalId?: string;
  documentNumber?: string;
  minAmount?: number;
  maxAmount?: number;
};

export type Currency = 'MAD' | 'EUR';

export type CheckEncashment = {
  id: string;
  supplier_id: string;
  supplier_name: string;
  bank_name: string;
  due_date: string;
  amount: number;
  currency: Currency;
  status: 'pending' | 'deposited' | 'bounced' | 'cashed';
  check_number: string;
  comment?: string;
  created_at: string;
  updated_at: string;
};

export type TreasuryScenario = {
  id: number;
  name: string;
  description?: string;
  type: 'income' | 'expense';
  order: number;
};

export type TreasuryEntry = {
  id: number;
  scenario_id: number;
  month: string;
  amount: number;
};

// Zod schema for validation
export const checkEncashmentSchema = z.object({
  supplier_id: z.string(),
  bank_name: z.string(),
  due_date: z.string(),
  amount: z.number().positive(),
  currency: z.enum(['MAD', 'EUR']),
  status: z.enum(['pending', 'deposited', 'bounced', 'cashed']),
  check_number: z.string().min(1),
  comment: z.string().optional()
});

export const treasuryScenarioSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['income', 'expense']),
  order: z.number().int().positive()
});

export const treasuryEntrySchema = z.object({
  scenario_id: z.number().int().positive(),
  month: z.string(),
  amount: z.number()
});