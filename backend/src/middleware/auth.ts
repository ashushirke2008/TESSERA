import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthUser, BusinessRole, Permission, ROLE_PERMISSIONS } from '../types';
import { AppError } from './errorHandler';
import { authService } from '../services/auth.service';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

// Development users with established identity-to-role mappings
export const DEV_USERS: Record<string, AuthUser> = {
  'admin@tessera.network': {
    identityId: 'did:fabric:admin',
    mspId: 'Org1MSP',
    role: 'ADMINISTRATOR',
    displayName: 'System Administrator (Org1MSP Admin)',
  },
  'registrar@org1.example.com': {
    identityId: 'did:fabric:org1:registrar01',
    mspId: 'Org1MSP',
    role: 'ISSUER_REGISTRAR',
    displayName: 'Asset Registrar (Org1MSP)',
  },
  'verifier@inspection.service': {
    identityId: 'did:fabric:verifier:accredited01',
    mspId: 'Org1MSP',
    role: 'VERIFIER',
    displayName: 'Accredited Verifier (Inspection & Survey)',
  },
  'investor@capital.fund': {
    identityId: 'did:fabric:investor:buyer01',
    mspId: 'Org1MSP',
    role: 'INVESTOR_BUYER',
    displayName: 'Qualified Institutional Investor',
  },
  'compliance@governance.org': {
    identityId: 'did:fabric:compliance:officer01',
    mspId: 'Org1MSP',
    role: 'COMPLIANCE_OFFICER',
    displayName: 'Chief Compliance Officer',
  },
  'auditor@regulatory.gov': {
    identityId: 'did:fabric:auditor:reg01',
    mspId: 'Org1MSP',
    role: 'AUDITOR',
    displayName: 'External Regulatory Auditor',
  },
};

export function generateToken(user: AuthUser): string {
  if (!config.jwt.secret) {
    throw new Error('API_JWT_SECRET is not configured');
  }
  return jwt.sign(
    {
      jti: crypto.randomBytes(16).toString('hex'),
      sub: user.identityId,
      mspId: user.mspId,
      role: user.role,
      displayName: user.displayName,
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions
  );
}

export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication token is required (Bearer <token>)'));
  }

  const token = authHeader.split(' ')[1];
  if (authService.isTokenRevoked(token)) {
    return next(new AppError(401, 'TOKEN_REVOKED', 'Authentication token has been revoked or logged out'));
  }
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as {
      sub: string;
      mspId: string;
      role: BusinessRole;
      displayName: string;
    };

    req.user = {
      identityId: decoded.sub,
      mspId: decoded.mspId,
      role: decoded.role,
      displayName: decoded.displayName,
    };
    next();
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError(401, 'TOKEN_EXPIRED', 'Authentication token has expired'));
    }
    return next(new AppError(401, 'INVALID_TOKEN', 'Invalid authentication token'));
  }
}

export function requirePermission(permission: Permission) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
    if (!userPermissions.includes(permission)) {
      return next(
        new AppError(
          403,
          'FORBIDDEN',
          `Access denied: Role '${req.user.role}' lacks required permission '${permission}'`
        )
      );
    }
    next();
  };
}

export function requireRole(...roles: BusinessRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          'FORBIDDEN',
          `Access denied: Operation requires one of roles [${roles.join(', ')}]`
        )
      );
    }
    next();
  };
}
