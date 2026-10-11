import { Router, Request, Response, NextFunction } from 'express';
import { generateToken, authenticate, AuthenticatedRequest } from '../middleware/auth';
import { authService } from '../services/auth.service';
import { AppError } from '../middleware/errorHandler';
import { ROLE_PERMISSIONS } from '../types';
import { config } from '../config';

export const authRouter = Router();

/**
 * POST /api/auth/login
 * Verifies credentials against server-managed demo identities (in demo mode)
 * and returns a signed JWT token with server-derived role and permissions.
 */
authRouter.post('/auth/login', (req: Request, res: Response, next: NextFunction) => {
  const identifier = req.body.username || req.body.email;
  const password = req.body.password;

  if (!identifier || typeof identifier !== 'string') {
    return next(new AppError(400, 'INVALID_INPUT', 'Username or email identifier is required'));
  }

  try {
    const { user } = authService.authenticate(identifier, password, req.ip);
    const token = generateToken(user);

    res.status(200).json({
      success: true,
      data: {
        token,
        user,
        permissions: ROLE_PERMISSIONS[user.role],
        tokenType: 'Bearer',
        expiresIn: config.jwt.expiresIn,
      },
    });
  } catch (err: unknown) {
    const errMsg = (err as Error).message || 'Authentication failed';
    if (errMsg.startsWith('DEMO_AUTH_DISABLED')) {
      return next(new AppError(403, 'DEMO_AUTH_DISABLED', errMsg));
    }
    if (errMsg.startsWith('RATE_LIMITED')) {
      return next(new AppError(429, 'RATE_LIMITED', errMsg));
    }
    return next(new AppError(401, 'INVALID_CREDENTIALS', errMsg));
  }
});

/**
 * POST /api/auth/logout
 * Revokes the current token session on the server.
 */
authRouter.post('/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    authService.revokeToken(token);
  }

  res.status(200).json({
    success: true,
    data: {
      message: 'Session terminated and token revoked successfully',
    },
  });
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user identity, role, and permission matrix.
 */
authRouter.get('/auth/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
      permissions: ROLE_PERMISSIONS[req.user!.role],
    },
  });
});

/**
 * GET /api/auth/demo-accounts
 * In local development / demo mode only, returns available demonstration accounts.
 * Disabled completely in production environments.
 */
authRouter.get('/auth/demo-accounts', (_req: Request, res: Response) => {
  const accounts = authService.getPublicDemoAccounts();
  res.status(200).json({
    success: true,
    data: {
      demoAuthEnabled: config.demoAuthEnabled && config.env !== 'production',
      accounts,
      demoPasswordHint: config.demoAuthEnabled && config.env !== 'production' ? 'TesseraDemo@2026' : undefined,
    },
  });
});

/**
 * GET /api/auth/roles
 * Returns role hierarchy and permissions matrix for reference.
 */
authRouter.get('/auth/roles', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      roles: Object.keys(ROLE_PERMISSIONS),
      permissionsMatrix: ROLE_PERMISSIONS,
    },
  });
});
