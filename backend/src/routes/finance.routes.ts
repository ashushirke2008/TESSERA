import { Router, Response, NextFunction } from 'express';
import { ledgerService } from '../services/ledger.service';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const financeRouter = Router();

// ==================== VALUATION ====================
financeRouter.post('/valuation', authenticate, requirePermission('VALUATION_RECORD'), (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { assetId, source, amount, currency, methodology, validityHours } = req.body;
    if (!assetId || !source || amount === undefined) {
      return next(new AppError(400, 'MISSING_FIELDS', 'assetId, source, and amount are required'));
    }

    const val = ledgerService.recordValuation(
      assetId,
      source,
      Number(amount),
      currency || 'USD',
      methodology || 'DCF',
      validityHours ? Number(validityHours) : 720,
      req.user!.identityId
    );

    res.status(201).json({
      success: true,
      data: val,
    });
  } catch (err) {
    next(new AppError(400, 'VALUATION_FAILED', (err as Error).message));
  }
});

// ==================== TOKENS ====================
financeRouter.post('/tokens/issue', authenticate, requirePermission('TOKEN_ISSUE'), (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { assetId, symbol, totalSupply } = req.body;
    if (!assetId || !symbol || !totalSupply) {
      return next(new AppError(400, 'MISSING_FIELDS', 'assetId, symbol, and totalSupply are required'));
    }

    const token = ledgerService.issueTokens(assetId, symbol, Number(totalSupply), req.user!.identityId);
    res.status(201).json({
      success: true,
      data: token,
    });
  } catch (err) {
    next(new AppError(400, 'TOKEN_ISSUANCE_FAILED', (err as Error).message));
  }
});

financeRouter.get('/tokens/:id', (req, res, next) => {
  try {
    const token = ledgerService.getToken(req.params.id);
    res.status(200).json({
      success: true,
      data: token,
    });
  } catch (err) {
    next(new AppError(404, 'TOKEN_NOT_FOUND', (err as Error).message));
  }
});

// ==================== PLEDGES ====================
financeRouter.get('/pledges', (req, res) => {
  const assetId = req.query.assetId as string | undefined;
  const pledges = ledgerService.getPledges(assetId);
  res.status(200).json({
    success: true,
    data: pledges,
  });
});

financeRouter.post('/pledges', authenticate, requirePermission('PLEDGE_CREATE'), (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { assetId, lender, borrower, amountPledged } = req.body;
    if (!assetId || !lender || !borrower) {
      return next(new AppError(400, 'MISSING_FIELDS', 'assetId, lender, and borrower are required'));
    }

    const pledge = ledgerService.createPledge(
      assetId,
      lender,
      borrower,
      Number(amountPledged) || 0,
      req.user!.identityId
    );

    res.status(201).json({
      success: true,
      data: pledge,
    });
  } catch (err) {
    next(new AppError(400, 'PLEDGE_CREATION_FAILED', (err as Error).message));
  }
});

financeRouter.post('/pledges/:id/release', authenticate, requirePermission('PLEDGE_RELEASE'), (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const pledge = ledgerService.releasePledge(req.params.id, req.user!.identityId);
    res.status(200).json({
      success: true,
      data: pledge,
    });
  } catch (err) {
    next(new AppError(400, 'PLEDGE_RELEASE_FAILED', (err as Error).message));
  }
});

// ==================== POLICIES ====================
financeRouter.get('/policies', (_req, res) => {
  const policies = ledgerService.getPolicies();
  res.status(200).json({
    success: true,
    data: policies,
  });
});

// ==================== TRANSFERS ====================
financeRouter.post('/transfers/simulate', (req, res, next) => {
  try {
    const { tokenId, fromOwner, toOwner, amount } = req.body;
    if (!tokenId || !fromOwner || !toOwner || amount === undefined) {
      return next(new AppError(400, 'MISSING_FIELDS', 'tokenId, fromOwner, toOwner, and amount are required'));
    }

    const result = ledgerService.simulateTransfer(tokenId, fromOwner, toOwner, Number(amount));
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(new AppError(400, 'SIMULATION_FAILED', (err as Error).message));
  }
});

financeRouter.post('/transfers/execute', authenticate, requirePermission('TRANSFER_EXECUTE'), (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { tokenId, fromOwner, toOwner, amount } = req.body;
    if (!tokenId || !fromOwner || !toOwner || amount === undefined) {
      return next(new AppError(400, 'MISSING_FIELDS', 'tokenId, fromOwner, toOwner, and amount are required'));
    }

    const updatedToken = ledgerService.executeTransfer(
      tokenId,
      fromOwner,
      toOwner,
      Number(amount),
      req.user!.identityId
    );

    res.status(200).json({
      success: true,
      data: {
        confirmed: true,
        transactionStatus: 'COMMITTED',
        token: updatedToken,
      },
    });
  } catch (err) {
    next(new AppError(400, 'TRANSFER_FAILED', (err as Error).message));
  }
});
