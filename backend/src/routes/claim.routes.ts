import { Router, Response, NextFunction } from 'express';
import { ledgerService } from '../services/ledger.service';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const claimRouter = Router();

claimRouter.post('/claims', authenticate, requirePermission('CLAIM_SUBMIT'), (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { assetId, claimType, evidenceIds } = req.body;
    if (!assetId || !claimType) {
      return next(new AppError(400, 'MISSING_FIELDS', 'assetId and claimType are required'));
    }

    const claim = ledgerService.submitClaim(assetId, claimType, req.user!.identityId, evidenceIds || []);
    res.status(201).json({
      success: true,
      data: claim,
    });
  } catch (err) {
    next(new AppError(400, 'CLAIM_SUBMISSION_FAILED', (err as Error).message));
  }
});

claimRouter.post('/claims/:id/review', authenticate, requirePermission('CLAIM_VERIFY'), (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { decision, rejectionReason } = req.body;
    if (decision !== 'ACCEPTED' && decision !== 'REJECTED') {
      return next(new AppError(400, 'INVALID_DECISION', "decision must be either 'ACCEPTED' or 'REJECTED'"));
    }

    const claim = ledgerService.reviewClaim(req.params.id, decision, req.user!.identityId, rejectionReason);
    res.status(200).json({
      success: true,
      data: claim,
    });
  } catch (err) {
    next(new AppError(400, 'CLAIM_REVIEW_FAILED', (err as Error).message));
  }
});

export const approvalRouter = Router();

approvalRouter.post('/approvals', authenticate, requirePermission('APPROVAL_SUBMIT'), (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { assetId, action, decision, comments } = req.body;
    if (!assetId || !action || !decision) {
      return next(new AppError(400, 'MISSING_FIELDS', 'assetId, action, and decision are required'));
    }

    const approval = ledgerService.submitApproval(
      assetId,
      action,
      req.user!.role,
      req.user!.identityId,
      decision,
      comments || ''
    );

    res.status(201).json({
      success: true,
      data: approval,
    });
  } catch (err) {
    next(new AppError(400, 'APPROVAL_FAILED', (err as Error).message));
  }
});
