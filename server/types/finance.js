import { z } from 'zod';

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