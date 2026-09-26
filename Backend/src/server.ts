import http from 'http';
import { app } from './app';
import { env } from './config/env.config';
import { connectDatabase, disconnectDatabase } from './config/db.config';
import { logger } from './config/logger.config';

let server: http.Server;

const startServer = async (): Promise<void> => {
  try {
    // 1. Start HTTP server first so port is immediately open and accessible
    server = app.listen(env.PORT, () => {
      logger.info(`🚀 ACS Customer Service Backend running on port ${env.PORT} in ${env.NODE_ENV} mode`);
      logger.info(`📍 Base URL: http://localhost:${env.PORT}`);
      logger.info(`📖 Swagger documentation: http://localhost:${env.PORT}/api/docs`);
      logger.info(`🩺 Health check: http://localhost:${env.PORT}/health`);
    });

    // 2. Connect to Database asynchronously without blocking server listening
    connectDatabase().catch((err) => {
      logger.error('⚠️ MySQL connection could not be established:', err.message);
      logger.info('💡 Note: Verify the MySQL host, credentials, and database are available.');
    });
  } catch (error) {
    logger.error('Failed to initialize application server:', error);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Gracefully shutting down application server...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');
      await disconnectDatabase();
      logger.info('Graceful shutdown completed.');
      process.exit(0);
    });

    // Force close after 10s if hanging
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception thrown:', error);
  process.exit(1);
});

startServer();
