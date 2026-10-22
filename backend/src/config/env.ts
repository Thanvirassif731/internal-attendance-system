import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: process.env.NODE_ENV === 'production' ? '.env' : '.env' });

export const PORT = Number(process.env.PORT) || 5000;
export const DATABASE_URL = process.env.DATABASE_URL || '';
export const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
export const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
export const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

export const config = {
  port: PORT,
  databaseUrl: DATABASE_URL,
  jwtSecret: JWT_SECRET,
  jwtExpiresIn: JWT_EXPIRES_IN,
  bcryptSaltRounds: BCRYPT_SALT_ROUNDS,
  corsOrigin: CORS_ORIGIN,
};
