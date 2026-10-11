import dotenv from 'dotenv';
import path from 'path';

// Load .env file from project root or backend dir if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export interface AppConfig {
  env: 'development' | 'production' | 'test';
  demoAuthEnabled: boolean;
  port: number;
  corsAllowedOrigins: string[];
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  jwt: {
    secret: string;
    expiresIn: string;
    isConfigured: boolean;
  };
  fabric: {
    channelName: string;
    chaincodeName: string;
    mspId: string;
    peerEndpoint: string;
    peerTlsCertPath: string;
    gatewayPeerHostAlias: string;
    caUrl: string;
    caTlsCertPath: string;
    adminIdentityPath: string;
    walletPath: string;
    isConfigured: boolean;
    missingKeys: string[];
  };
  minio: {
    endpoint: string;
    port: number;
    useSsl: boolean;
    accessKey: string;
    secretKey: string;
    bucketEvidence: string;
    isConfigured: boolean;
    missingKeys: string[];
  };
  adapters: {
    governmentRegistryUrl?: string;
    valuationServiceUrl?: string;
    insuranceServiceUrl?: string;
    inspectionServiceUrl?: string;
    activeCount: number;
  };
}

export interface ConfigValidationResult {
  isValid: boolean;
  environment: string;
  missingRequired: string[];
  unconfiguredIntegrations: {
    fabric: string[];
    minio: string[];
  };
}

function parseOrigins(raw?: string): string[] {
  if (!raw) return ['http://localhost:5173'];
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

function isPlaceholderOrEmpty(val?: string): boolean {
  if (!val) return true;
  const trimmed = val.trim();
  return (
    trimmed === '' ||
    trimmed.startsWith('PLACEHOLDER') ||
    trimmed.startsWith('/path/to') ||
    trimmed === 'undefined'
  );
}

export function loadConfig(): AppConfig {
  const env = (process.env.NODE_ENV as AppConfig['env']) || 'development';
  const port = parseInt(process.env.API_PORT || '3000', 10);
  const logLevel = (process.env.LOG_LEVEL as AppConfig['logLevel']) || 'info';
  const corsAllowedOrigins = parseOrigins(process.env.CORS_ALLOWED_ORIGINS);

  // Fabric Gateway configuration check
  const fabricKeys: Record<string, string | undefined> = {
    FABRIC_CHANNEL_NAME: process.env.FABRIC_CHANNEL_NAME,
    FABRIC_CHAINCODE_NAME: process.env.FABRIC_CHAINCODE_NAME,
    FABRIC_MSP_ID: process.env.FABRIC_MSP_ID,
    FABRIC_PEER_ENDPOINT: process.env.FABRIC_PEER_ENDPOINT,
    FABRIC_PEER_TLS_CERT_PATH: process.env.FABRIC_PEER_TLS_CERT_PATH,
    FABRIC_GATEWAY_PEER_HOST_ALIAS: process.env.FABRIC_GATEWAY_PEER_HOST_ALIAS,
  };

  const fabricMissing: string[] = [];
  for (const [key, val] of Object.entries(fabricKeys)) {
    if (isPlaceholderOrEmpty(val)) {
      fabricMissing.push(key);
    }
  }

  // MinIO Object Store configuration check
  const minioKeys: Record<string, string | undefined> = {
    MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
    MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY,
    MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY,
    MINIO_BUCKET_EVIDENCE: process.env.MINIO_BUCKET_EVIDENCE,
  };

  const minioMissing: string[] = [];
  for (const [key, val] of Object.entries(minioKeys)) {
    if (isPlaceholderOrEmpty(val)) {
      minioMissing.push(key);
    }
  }

  // JWT configuration check
  const rawJwtSecret = process.env.API_JWT_SECRET;
  const jwtIsConfigured = !isPlaceholderOrEmpty(rawJwtSecret);
  // In development/test mode, fall back to dev secret if not configured in environment
  const jwtSecret = jwtIsConfigured
    ? rawJwtSecret!
    : (env === 'production' ? '' : 'tessera-development-signing-secret-dev-mode-only');

  // External adapters check
  let activeAdapters = 0;
  if (!isPlaceholderOrEmpty(process.env.GOVERNMENT_REGISTRY_API_URL)) activeAdapters++;
  if (!isPlaceholderOrEmpty(process.env.VALUATION_SERVICE_API_URL)) activeAdapters++;
  if (!isPlaceholderOrEmpty(process.env.INSURANCE_SERVICE_API_URL)) activeAdapters++;
  if (!isPlaceholderOrEmpty(process.env.INSPECTION_SERVICE_API_URL)) activeAdapters++;

  // Demo Authentication mode: forbidden in production
  const isProduction = env === 'production';
  const rawDemoAuth = process.env.DEMO_AUTH_ENABLED;
  const demoAuthEnabled = !isProduction && (rawDemoAuth === 'true' || rawDemoAuth === undefined);

  return {
    env,
    demoAuthEnabled,
    port: isNaN(port) ? 3000 : port,
    corsAllowedOrigins,
    logLevel,
    jwt: {
      secret: jwtSecret,
      expiresIn: process.env.API_JWT_EXPIRES_IN || '1h',
      isConfigured: jwtIsConfigured,
    },
    fabric: {
      channelName: process.env.FABRIC_CHANNEL_NAME || 'mychannel',
      chaincodeName: process.env.FABRIC_CHAINCODE_NAME || 'asset-contract',
      mspId: process.env.FABRIC_MSP_ID || 'Org1MSP',
      peerEndpoint: process.env.FABRIC_PEER_ENDPOINT || 'localhost:7051',
      peerTlsCertPath: process.env.FABRIC_PEER_TLS_CERT_PATH || '',
      gatewayPeerHostAlias: process.env.FABRIC_GATEWAY_PEER_HOST_ALIAS || '',
      caUrl: process.env.FABRIC_CA_URL || '',
      caTlsCertPath: process.env.FABRIC_CA_TLS_CERT_PATH || '',
      adminIdentityPath: process.env.FABRIC_ADMIN_IDENTITY_PATH || '',
      walletPath: process.env.FABRIC_WALLET_PATH || '',
      isConfigured: fabricMissing.length === 0,
      missingKeys: fabricMissing,
    },
    minio: {
      endpoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSsl: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || '',
      secretKey: process.env.MINIO_SECRET_KEY || '',
      bucketEvidence: process.env.MINIO_BUCKET_EVIDENCE || 'tessera-evidence',
      isConfigured: minioMissing.length === 0,
      missingKeys: minioMissing,
    },
    adapters: {
      governmentRegistryUrl: process.env.GOVERNMENT_REGISTRY_API_URL,
      valuationServiceUrl: process.env.VALUATION_SERVICE_API_URL,
      insuranceServiceUrl: process.env.INSURANCE_SERVICE_API_URL,
      inspectionServiceUrl: process.env.INSPECTION_SERVICE_API_URL,
      activeCount: activeAdapters,
    },
  };
}

export function validateEnvironment(): ConfigValidationResult {
  const config = loadConfig();
  const missingRequired: string[] = [];

  // API essentials
  if (!process.env.PORT && !process.env.API_PORT && config.env === 'production') {
    missingRequired.push('API_PORT');
  }

  return {
    isValid: missingRequired.length === 0,
    environment: config.env,
    missingRequired,
    unconfiguredIntegrations: {
      fabric: config.fabric.missingKeys,
      minio: config.minio.missingKeys,
    },
  };
}

export const config = loadConfig();
