import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { minioService } from '../services/minio.service';
import { ledgerService } from '../services/ledger.service';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const evidenceRouter = Router();

// Memory storage for immediate streaming & SHA-256 computation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/tiff',
      'application/json',
      'text/csv',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type '${file.mimetype}'. Allowed: PDF, PNG, JPEG, TIFF, JSON, CSV`));
    }
  },
});

evidenceRouter.post(
  '/evidence/upload',
  authenticate,
  requirePermission('EVIDENCE_SUBMIT'),
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return next(new AppError(400, 'NO_FILE_UPLOADED', 'File is required'));
      }

      const { assetId, docType } = req.body;
      if (!assetId || !docType) {
        return next(new AppError(400, 'MISSING_FIELDS', 'assetId and docType are required'));
      }

      // 1. Calculate SHA-256 and store in MinIO / verified cache
      const evidence = await minioService.uploadEvidence(
        assetId,
        docType,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        req.user!.identityId
      );

      // 2. Commit evidence hash on-chain via LedgerService
      ledgerService.recordEvidence(assetId, evidence);

      res.status(201).json({
        success: true,
        data: evidence,
      });
    } catch (err) {
      next(new AppError(500, 'EVIDENCE_UPLOAD_FAILED', (err as Error).message));
    }
  }
);

evidenceRouter.post(
  '/evidence/verify',
  authenticate,
  requirePermission('EVIDENCE_VIEW'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { objectKey, expectedHash } = req.body;
      if (!objectKey || !expectedHash) {
        return next(new AppError(400, 'MISSING_FIELDS', 'objectKey and expectedHash are required'));
      }

      const result = await minioService.verifyEvidenceIntegrity(objectKey, expectedHash);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(new AppError(500, 'VERIFICATION_FAILED', (err as Error).message));
    }
  }
);
