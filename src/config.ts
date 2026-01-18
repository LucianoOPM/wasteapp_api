export default () => ({
  app: {
    host: process.env.HOST || 'localhost',
    port: Number(process.env.PORT) || 8080,
    salt: Number(process.env.SALT) || 10,
    frontend: process.env.FRONTEND_URL!,
  },
  db: {
    url: process.env.DATABASE_URL!,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    issuer: 'wasteapp-backend',
    audience: 'wasteapp-client',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresInLong: process.env.JWT_REFRESH_EXPIRES_IN_LONG || '30d', // Remember me = true
    refreshExpiresInShort: process.env.JWT_REFRESH_EXPIRES_IN_SHORT || '7d', // Remember me = false (cambiado de 1h a 7d)
  },
  cookies: {
    accessTokenName: 'access_token',
    refreshTokenName: 'refresh_token',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
  },
});
