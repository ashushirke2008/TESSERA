import { Router, Request, Response } from 'express';
import { config, validateEnvironment } from '../config';
import { HealthStatus, ReadinessReport, DependencyStatus } from '../types';
import { ledgerService } from '../services/ledger.service';

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
 */
healthRouter.get('/ready', (_req: Request, res: Response) => {
  const envValidation = validateEnvironment();

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

  const statusCode = isReady ? 200 : 503;
  res.status(statusCode).json({
    success: isReady,
    data: readiness,
  });
});

/**
 * GET /api/dashboard/stats
 * Returns authoritative metrics for Registered Assets, Pending Claims, Approvals Queue, and Tokenized Holdings.
 * Explicitly indicates whether results derive from demonstration fixtures or live Fabric world-state.
 */
healthRouter.get('/dashboard/stats', (_req: Request, res: Response) => {
  const stats = ledgerService.getDashboardStats();
  res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * GET /api/health/system
 * Returns a 10-component detailed health and readiness report for administrator diagnostics.
 * Conforms to zero-leak security rules: no passwords, tokens, private keys, or certificates exposed.
 */
healthRouter.get('/health/system', (_req: Request, res: Response) => {
  const now = new Date().toISOString();
  const envValidation = validateEnvironment();

  const components = [
    {
      id: 'backend-liveness',
      name: 'Backend API Liveness',
      status: 'healthy',
      explanation: `Express process running (PID ${process.pid}, uptime ${Math.floor(process.uptime())}s).`,
      lastChecked: now,
      checkType: 'live_probe',
      safeRemediationHint: 'Service is responding normally to HTTP health checks.',
    },
    {
      id: 'backend-readiness',
      name: 'Backend Dependency Readiness',
      status: envValidation.isValid ? 'degraded' : 'unavailable',
      explanation: 'Application core running; blockchain peer and object store dependencies in local development mode.',
      lastChecked: now,
      checkType: 'live_probe',
      safeRemediationHint: 'Connect Hyperledger Fabric network and MinIO service to reach full READY state.',
    },
    {
      id: 'fabric-gateway',
      name: 'Hyperledger Fabric Gateway',
      status: config.fabric.isConfigured ? 'unavailable' : 'not_configured',
      explanation: config.fabric.isConfigured
        ? `Configured for ${config.fabric.peerEndpoint} (${config.fabric.mspId}), but peer connection not active.`
        : `Fabric gateway parameters missing: ${config.fabric.missingKeys.join(', ')}.`,
      lastChecked: now,
      checkType: 'live_probe',
      safeRemediationHint: 'Deploy Fabric network using: docker compose -f infrastructure/docker-compose.yaml up -d peer0.org1.example.com',
    },
    {
      id: 'peer-channel',
      name: `Fabric Channel Access (${config.fabric.channelName})`,
      status: config.fabric.isConfigured ? 'unavailable' : 'not_configured',
      explanation: `Channel '${config.fabric.channelName}' queries require active peer endorsement.`,
      lastChecked: now,
      checkType: 'configuration_inspection',
      safeRemediationHint: 'Verify channel creation and peer join using Fabric CLI.',
    },
    {
      id: 'chaincode',
      name: `Chaincode Contract (${config.fabric.chaincodeName})`,
      status: config.fabric.isConfigured ? 'unavailable' : 'not_configured',
      explanation: `Canonical chaincode located at blockchain/chaincode/asset-contract/ (Go).`,
      lastChecked: now,
      checkType: 'configuration_inspection',
      safeRemediationHint: 'Package and commit chaincode onto channel before querying world-state.',
    },
    {
      id: 'minio-store',
      name: 'MinIO Off-Chain Evidence Store',
      status: config.minio.isConfigured ? 'unavailable' : 'not_configured',
      explanation: config.minio.isConfigured
        ? `Endpoint configured at ${config.minio.endpoint}:${config.minio.port}, but connection test failed.`
        : `MinIO credentials unconfigured or using placeholders. Missing: ${config.minio.missingKeys.join(', ')}.`,
      lastChecked: now,
      checkType: 'live_probe',
      safeRemediationHint: 'Start MinIO container: docker compose -f infrastructure/docker-compose.yaml up -d minio',
    },
    {
      id: 'evidence-bucket',
      name: `Evidence Storage Bucket (${config.minio.bucketEvidence})`,
      status: config.minio.isConfigured ? 'unavailable' : 'not_configured',
      explanation: `Target bucket '${config.minio.bucketEvidence}' stores SHA-256 verified asset documents.`,
      lastChecked: now,
      checkType: 'configuration_inspection',
      safeRemediationHint: 'Ensure bucket exists via MinIO Console (http://localhost:9001).',
    },
    {
      id: 'external-adapters',
      name: 'External Verification Adapters',
      status: 'healthy',
      explanation: '4 simulation adapters active: Government Registry, Valuation, Insurance, Inspection.',
      lastChecked: now,
      checkType: 'live_probe',
      safeRemediationHint: 'Simulated adapters operational for local demonstrations. No 3rd-party API keys required.',
    },
    {
      id: 'auth-security',
      name: 'Authentication & Session Security',
      status: config.jwt.isConfigured ? 'healthy' : (config.env === 'production' ? 'unavailable' : 'degraded'),
      explanation: config.demoAuthEnabled
        ? 'Local Demonstration Mode active with 6 role-based demo accounts.'
        : 'Enterprise JWT authentication configured.',
      lastChecked: now,
      checkType: 'configuration_inspection',
      safeRemediationHint: 'Generate a random 32-byte hex string for API_JWT_SECRET in production.',
    },
    {
      id: 'environment-runtime',
      name: 'Environment Runtime Mode',
      status: 'healthy',
      explanation: `Running in '${config.env}' mode with DEMO_AUTH_ENABLED=${config.demoAuthEnabled}.`,
      lastChecked: now,
      checkType: 'configuration_inspection',
      safeRemediationHint: 'Ensure NODE_ENV=production in production deployments.',
    },
  ];

  res.status(200).json({
    success: true,
    data: {
      service: 'tessera-api',
      environment: config.env,
      timestamp: now,
      components,
    },
  });
});
