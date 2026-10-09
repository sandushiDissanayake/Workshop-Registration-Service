export function loadConfig() {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long');
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL must be set');
  return {
    databaseUrl,
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
    port: Number(process.env.PORT ?? 4000),
    corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(','),
  };
}
export type AppConfig = ReturnType<typeof loadConfig>;
export const APP_CONFIG = 'APP_CONFIG';
