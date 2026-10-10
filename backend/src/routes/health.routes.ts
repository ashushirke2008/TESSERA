import { Router, Request, Response } from 'express';
import { config, validateEnvironment } from '../config';
import { HealthStatus, ReadinessReport, DependencyStatus } from '../types';

export const healthRouter = Router();

/**
 * GET /api/health
 * Returns the immediate liveness and operational status of the API process.
 */
healthRouter.get('/health', (_req: Request, res: Response) => {
  const health: HealthStatus = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: '1.0.0',
    environment: config.env,
  };

  res.status(200).json({
    success: true,
    data: health,
  });
});

/**
 * GET /api/ready
 * Reports whether all required backend dependencies (Fabric Gateway, MinIO, configuration)
 * are configured and connected.
 * Explicitly distinguishes unconfigured / pending integration states from healthy ones.
 */
healthRouter.get('/ready', (_req: Request, res: Response) => {
  const envValidation = validateEnvironment();

  // Determine Fabric status:
  // If configuration keys are missing or placeholders, report 'unconfigured'.
  // Even if configured, until stage 1 network is active and verified, report 'disconnected' or 'unconfigured'.
  const fabricStatus: DependencyStatus = config.fabric.isConfigured
    ? {
        status: 'disconnected',
        configured: true,
        connected: false,
        endpoint: config.fabric.peerEndpoint,
        message: 'Fabric Gateway configuration present, but connection to peer has not been established yet (Stage 1 pending).',
      }
    : {
        status: 'unconfigured',
        configured: false,
        connected: false,
        endpoint: config.fabric.peerEndpoint,
        message: `Fabric credentials/connection settings are unconfigured or using placeholders. Missing: ${config.fabric.missingKeys.join(', ')}`,
      };

  // Determine MinIO status:
  const minioStatus: DependencyStatus = config.minio.isConfigured
    ? {
        status: 'disconnected',
        configured: true,
        connected: false,
        endpoint: `${config.minio.endpoint}:${config.minio.port}`,
        message: 'MinIO credentials present, but client verification connection is pending (Stage 2 pending).',
      }
    : {
        status: 'unconfigured',
        configured: false,
        connected: false,
        endpoint: `${config.minio.endpoint}:${config.minio.port}`,
        message: `MinIO object storage settings are unconfigured or using placeholders. Missing: ${config.minio.missingKeys.join(', ')}`,
      };

  // Determine overall readiness status:
  // Since Fabric and MinIO are not yet connected, the system is NOT_READY for full production operations.
  const isReady = fabricStatus.connected && minioStatus.connected && envValidation.isValid;

  const readiness: ReadinessReport = {
    status: isReady ? 'READY' : 'NOT_READY',
    timestamp: new Date().toISOString(),
    service: 'tessera-api',
    dependencies: {
      environment: {
        status: envValidation.isValid ? 'configured' : 'incomplete',
        ...(envValidation.missingRequired.length > 0
          ? { missingRequiredKeys: envValidation.missingRequired }
          : {}),
      },
      fabric: fabricStatus,
      minio: minioStatus,
      adapters: {
        status: config.adapters.activeCount > 0 ? 'partial' : 'unconfigured',
        configuredCount: config.adapters.activeCount,
        availableAdapters: [
          'government-registry',
          'valuation-service',
          'insurance-service',
          'inspection-service',
        ],
      },
    },
  };

  // 503 Service Unavailable when core dependencies are NOT ready, 200 when ready.
  const statusCode = isReady ? 200 : 503;
  res.status(statusCode).json({
    success: isReady,
    data: readiness,
  });
});
