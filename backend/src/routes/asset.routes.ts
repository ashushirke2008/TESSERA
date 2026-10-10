import { Router, Response, NextFunction } from 'express';
import { ledgerService } from '../services/ledger.service';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AssetType } from '../types';

export const assetRouter = Router();

// List assets (Public/authenticated)
assetRouter.get('/assets', (req, res) => {
  const typeFilter = req.query.type as AssetType | undefined;
  const assets = ledgerService.listAssets(typeFilter);
  res.status(200).json({
    success: true,
    data: assets,
  });
});

// Get asset by ID
assetRouter.get('/assets/:id', (req, res, next) => {
  try {
    const asset = ledgerService.getAsset(req.params.id);
    res.status(200).json({
      success: true,
      data: asset,
    });
  } catch (err) {
    next(new AppError(404, 'ASSET_NOT_FOUND', (err as Error).message));
  }
});

// Register new asset (Requires ASSET_REGISTER permission)
assetRouter.post('/assets', authenticate, requirePermission('ASSET_REGISTER'), (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const {
      assetId,
      assetType,
      templateVersion,
      name,
      owner,
      custodian,
      declaredValue,
      currency,
      rawFingerprint,
      metadata,
    } = req.body;

    if (!assetId || !assetType || !name || !rawFingerprint) {
      return next(new AppError(400, 'MISSING_FIELDS', 'assetId, assetType, name, and rawFingerprint are required'));
    }

    const effectiveOwner = owner || req.user!.identityId;
    const effectiveCustodian = custodian || req.user!.mspId;

    const asset = ledgerService.registerAsset(
      assetId,
      assetType,
      templateVersion || 'v1.0',
      name,
      effectiveOwner,
      effectiveCustodian,
      Number(declaredValue) || 0,
      currency || 'USD',
      rawFingerprint,
      metadata || {}
    );

    res.status(201).json({
      success: true,
      data: asset,
    });
  } catch (err) {
    next(new AppError(400, 'REGISTRATION_FAILED', (err as Error).message));
  }
});

// Update metadata
assetRouter.put('/assets/:id/metadata', authenticate, requirePermission('ASSET_MODIFY'), (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const asset = ledgerService.updateAssetMetadata(req.params.id, req.body.metadata || {}, req.user!.identityId);
    res.status(200).json({
      success: true,
      data: asset,
    });
  } catch (err) {
    next(new AppError(400, 'UPDATE_FAILED', (err as Error).message));
  }
});

// Asset audit history
assetRouter.get('/assets/:id/history', (req, res) => {
  const history = ledgerService.getAuditHistory(req.params.id);
  res.status(200).json({
    success: true,
    data: history,
  });
});
