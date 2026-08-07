import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { NextFunction, Request, Response } from 'express';
import { existsSync } from 'fs';
import helmet from 'helmet';
import * as path from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');
  const isProduction = process.env.NODE_ENV === 'production';
  const webDistPath = path.resolve(__dirname, '../../web/dist');
  const webIndexPath = path.join(webDistPath, 'index.html');

  app.use(helmet());
  app.use(cookieParser());

  const configuredCorsOrigins = process.env.CORS_ORIGIN
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const corsOrigins = configuredCorsOrigins?.length
    ? configuredCorsOrigins
    : !isProduction
      ? [process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5173']
      : [];

  // Production is same-origin by default, so CORS is only enabled when an
  // explicit origin is configured. Development keeps the existing Vite origin.
  if (corsOrigins.length > 0) {
    app.enableCors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  if (isProduction) {
    if (!existsSync(webIndexPath)) {
      throw new Error(
        `React production build not found at ${webIndexPath}. Run "pnpm build" before "pnpm start:prod".`,
      );
    }

    // Existing files from apps/web/dist are served directly. index.html is
    // handled by the fallback below so it can use no-cache headers.
    app.useStaticAssets(webDistPath, {
      index: false,
      fallthrough: true,
      maxAge: '1y',
      immutable: true,
    });
  }

  // Initialize Nest routes first. The fallback is appended afterwards so it
  // cannot shadow /api/v1 controllers.
  await app.init();

  if (isProduction) {
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.get('*', (req: Request, res: Response, next: NextFunction) => {
      const requestPath = req.path;

      // API and protected file endpoints must remain owned by NestJS. Missing
      // static assets with an extension also stay 404 instead of returning HTML.
      if (
        requestPath === '/api' ||
        requestPath.startsWith('/api/') ||
        requestPath === '/storage' ||
        requestPath.startsWith('/storage/') ||
        path.extname(requestPath)
      ) {
        return next();
      }

      res.setHeader('Cache-Control', 'no-cache');
      return res.sendFile(webIndexPath);
    });
  }

  const port = Number(process.env.PORT || process.env.API_PORT || 3000);
  await app.listen(port);

  logger.log('Assetra server started');
  logger.log(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
  logger.log(`Port: ${port}`);
  if (isProduction) logger.log(`Serving React build from: ${webDistPath}`);
}

void bootstrap();
