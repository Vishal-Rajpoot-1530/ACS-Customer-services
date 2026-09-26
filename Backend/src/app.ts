import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.config';
import { requestIdMiddleware } from './middlewares/requestId.middleware';
import { errorHandler } from './middlewares/error.middleware';
import { globalLimiter } from './middlewares/rateLimiter.middleware';
import apiRouter from './routes';
import healthRouter from './routes/health.routes';
import swaggerRouter from './docs/swagger';
import { AppError } from './utils/appError';
import { HttpStatusCodes } from './constants/httpStatusCodes.constant';

export const createApp = (): Application => {
  const app: Application = express();

  // 1. Trust Reverse Proxy (Nginx / ALB)
  app.set('trust proxy', 1);

  // 2. Request ID tracing middleware
  app.use(requestIdMiddleware);

  // 3. Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // 4. CORS Configuration
  const allowedOrigins = [
    env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or Postman)
        if (!origin) return callback(null, true);

        if (env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        callback(new AppError('CORS policy: Not allowed by CORS', HttpStatusCodes.FORBIDDEN, 'CORS_ERROR'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    })
  );

  // 5. Rate Limiting
  app.use(globalLimiter);

  // 6. Body Parsers & Cookie Parser
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser(env.COOKIE_SECRET));

  // 7. Root Welcome & Health Check
  app.get('/', (_req, res) => {
    res.status(HttpStatusCodes.OK).json({
      success: true,
      message: 'ACS Customer Service Centre Backend API',
      environment: env.NODE_ENV,
      version: '1.0.0',
      links: {
        documentation: '/api/docs',
        health: '/health',
        apiV1: '/api/v1',
      },
    });
  });

  app.get('/favicon.ico', (_req, res) => {
    res.status(HttpStatusCodes.NO_CONTENT).end();
  });

  app.use('/health', healthRouter);

  // Serve uploads for local dev storage fallback
  app.use('/uploads', express.static(require('path').resolve(process.cwd(), 'uploads')));

  // 8. Swagger Documentation (available in dev/staging, and at /api/docs)
  app.use('/api/docs', swaggerRouter);

  // 9. API Routes
  app.use('/api/v1', apiRouter);

  // 10. Handle 404 for undefined routes
  app.all('*', (req, _res, next) => {
    next(
      new AppError(
        `Route ${req.method} ${req.originalUrl} does not exist on this server`,
        HttpStatusCodes.NOT_FOUND,
        'ROUTE_NOT_FOUND'
      )
    );
  });

  // 11. Centralized Error Handler
  app.use(errorHandler);

  return app;
};

export const app = createApp();
