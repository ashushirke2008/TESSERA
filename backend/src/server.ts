import { app } from './app';
import { config, validateEnvironment } from './config';
import { logger } from './utils/logger';

function startServer() {
  const envValidation = validateEnvironment();

  logger.info('========================================================');
  logger.info('  TESSERA — Blockchain Asset Registry API Server');
  logger.info('========================================================');
  logger.info(`Environment: ${config.env}`);
  logger.info(`Port: ${config.port}`);
  logger.info(`Log Level: ${config.logLevel}`);
  logger.info(`CORS Origins: ${config.corsAllowedOrigins.join(', ')}`);

  // Report Fabric and MinIO configuration status safely (NO secrets logged)
  if (config.fabric.isConfigured) {
    logger.info(`Fabric Config: Configured for channel '${config.fabric.channelName}' (Gateway pending Stage 1)`);
  } else {
    logger.warn(`Fabric Config: Unconfigured / Placeholders present. Missing keys: ${config.fabric.missingKeys.join(', ')}`);
  }

  if (config.minio.isConfigured) {
    logger.info(`MinIO Config: Configured at ${config.minio.endpoint}:${config.minio.port} (Bucket: ${config.minio.bucketEvidence})`);
  } else {
    logger.warn(`MinIO Config: Unconfigured / Placeholders present. Missing keys: ${config.minio.missingKeys.join(', ')}`);
  }

  logger.info(`Simulated Adapters configured: ${config.adapters.activeCount}`);

  if (!envValidation.isValid) {
    logger.warn(`Required environment configuration missing: ${envValidation.missingRequired.join(', ')}`);
  }

  const server = app.listen(config.port, () => {
    logger.info(`TESSERA API Server is running on port ${config.port}`);
    logger.info(`Health check: http://localhost:${config.port}/api/health`);
    logger.info(`Readiness check: http://localhost:${config.port}/api/ready`);
  });

  const handleShutdown = (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      logger.info('Server closed. Process terminating.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  return server;
}

if (require.main === module) {
  startServer();
}

export { startServer };
