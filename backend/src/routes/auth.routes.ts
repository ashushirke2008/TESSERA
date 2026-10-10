import { Router, Request, Response, NextFunction } from 'express';
import { DEV_USERS, generateToken, authenticate, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { ROLE_PERMISSIONS } from '../types';

export const authRouter = Router();

authRouter.post('/auth/login', (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return next(new AppError(400, 'INVALID_INPUT', 'Email identifier is required'));
  }

  const user = DEV_USERS[email.toLowerCase()];
  if (!user) {
    return next(new AppError(401, 'INVALID_CREDENTIALS', `Unknown identity '${email}'. Permitted dev identities: ${Object.keys(DEV_USERS).join(', ')}`));
  }

  const token = generateToken(user);
  res.status(200).json({
    success: true,
    data: {
      token,
      user,
      permissions: ROLE_PERMISSIONS[user.role],
      tokenType: 'Bearer',
      expiresIn: '1h',
    },
  });
});

authRouter.get('/auth/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
      permissions: ROLE_PERMISSIONS[req.user!.role],
    },
  });
});

authRouter.get('/auth/roles', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      roles: Object.keys(ROLE_PERMISSIONS),
      permissionsMatrix: ROLE_PERMISSIONS,
      devUsers: Object.entries(DEV_USERS).map(([email, u]) => ({
        email,
        role: u.role,
        displayName: u.displayName,
      })),
    },
  });
});
