import { z } from 'zod';

// Schéma de validation pour les variables d'environnement
const envSchema = z.object({
  DB_DOLIBARR_HOST: z.string(),
  DB_DOLIBARR_USER: z.string(),
  DB_DOLIBARR_PASSWORD: z.string(),
  DB_DOLIBARR_NAME: z.string(),
  DB_DOLIBARR_PORT: z.string().transform(Number),
  DB_ERP_HOST: z.string(),
  DB_ERP_USER: z.string(),
  DB_ERP_PASSWORD: z.string(),
  DB_ERP_NAME: z.string(),
  DB_ERP_PORT: z.string().transform(Number),
});

// Validation des variables d'environnement
const env = envSchema.parse({
  DB_DOLIBARR_HOST: process.env.DB_DOLIBARR_HOST,
  DB_DOLIBARR_USER: process.env.DB_DOLIBARR_USER,
  DB_DOLIBARR_PASSWORD: process.env.DB_DOLIBARR_PASSWORD,
  DB_DOLIBARR_NAME: process.env.DB_DOLIBARR_NAME,
  DB_DOLIBARR_PORT: process.env.DB_DOLIBARR_PORT || '3306',
  DB_ERP_HOST: process.env.DB_ERP_HOST,
  DB_ERP_USER: process.env.DB_ERP_USER,
  DB_ERP_PASSWORD: process.env.DB_ERP_PASSWORD,
  DB_ERP_NAME: process.env.DB_ERP_NAME,
  DB_ERP_PORT: process.env.DB_ERP_PORT || '3306',
});

export default env;