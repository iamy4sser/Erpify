import { z } from 'zod';

export type User = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  google_id: string | null;
  created_at: string;
  updated_at: string;
};

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

export const registerSchema = loginSchema.extend({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalide'),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});