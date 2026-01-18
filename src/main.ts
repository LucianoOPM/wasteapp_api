/* eslint-disable @typescript-eslint/no-floating-promises */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  // Validar variables de entorno requeridas
  const requiredEnvVars = [
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'DATABASE_URL',
  ];

  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`,
    );
  }

  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const appPrefix = '/api/v1';

  app.setGlobalPrefix(appPrefix);

  // Configurar CORS para permitir cookies cross-origin
  app.enableCors({
    origin:
      config.getOrThrow<string>('app.frontend') || 'http://localhost:3000', // URL del frontend
    credentials: true, // CRÍTICO: Permite envío de cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.use(cookieParser()); // Configurar cookie-parser antes de interceptores
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const host = config.getOrThrow<string>('app.host');
  const port = config.getOrThrow<number>('app.port');

  await app.listen(port, host, () => {
    console.log(`app running on http://${host}:${port}${appPrefix}`);
  });
}
bootstrap();
