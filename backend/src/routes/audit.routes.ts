import { Router } from 'express';
import { ledgerService } from '../services/ledger.service';
import { externalAdaptersService, AdapterScenario } from '../adapters';
import { authenticate, requirePermission } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const auditRouter = Router();

// Protected audit trail view
auditRouter.get('/audit', authenticate, requirePermission('AUDIT_VIEW'), (req, res) => {
  const assetId = req.query.assetId as string | undefined;
  const history = ledgerService.getAuditHistory(assetId);
  res.status(200).json({
    success: true,
    data: history,
  });
});

export const adapterRouter = Router();

// Trigger simulated external adapter check
adapterRouter.post('/adapters/:service/verify', async (req, res, next) => {
  try {
    const service = req.params.service as 'government-registry' | 'valuation-service' | 'insurance-service' | 'inspection-service';
    const allowed = ['government-registry', 'valuation-service', 'insurance-service', 'inspection-service'];
    if (!allowed.includes(service)) {
      return next(new AppError(400, 'UNKNOWN_SERVICE', `Unknown adapter service: '${service}'`));
    }

    const { assetId, scenario } = req.body;
    if (!assetId) {
      return next(new AppError(400, 'MISSING_FIELDS', 'assetId is required'));
    }

    const result = await externalAdaptersService.verify(service, assetId, scenario as AdapterScenario);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(new AppError(500, 'ADAPTER_EXECUTION_FAILED', (err as Error).message));
  }
});
