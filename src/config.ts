export default () => ({
  app: {
    host: process.env.HOST || 'localhost',
    port: Number(process.env.PORT) || 8080,
    salt: Number(process.env.SALT) || 10,
  },
  db: {
    url: process.env.DATABASE_URL!,
  },
  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET ||
      'default-access-secret-change-in-production',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      'default-refresh-secret-change-in-production',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresInLong: process.env.JWT_REFRESH_EXPIRES_IN_LONG || '30d', // Remember me = true
    refreshExpiresInShort: process.env.JWT_REFRESH_EXPIRES_IN_SHORT || '1h', // Remember me = false
  },
  cookies: {
    accessTokenName: 'access_token',
    refreshTokenName: 'refresh_token',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
  },
});
