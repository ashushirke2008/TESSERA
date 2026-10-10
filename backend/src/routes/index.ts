import { Router } from 'express';
import { healthRouter } from './health.routes';
import { authRouter } from './auth.routes';
import { assetRouter } from './asset.routes';
import { evidenceRouter } from './evidence.routes';
import { claimRouter, approvalRouter } from './claim.routes';
import { financeRouter } from './finance.routes';
import { passportRouter } from './passport.routes';
import { auditRouter, adapterRouter } from './audit.routes';

export const apiRouter = Router();

// Liveness & Readiness
apiRouter.use(healthRouter);

// Authentication & Identity
apiRouter.use(authRouter);

// Core Asset Registry & Lifecycle
apiRouter.use(assetRouter);

// Evidence & SHA-256 Object Integrity
apiRouter.use(evidenceRouter);

// Claims & Maker-Checker Approvals
apiRouter.use(claimRouter);
apiRouter.use(approvalRouter);

// Valuation, Tokens, Pledges & Transfers
apiRouter.use(financeRouter);

// Public QR Asset Passport
apiRouter.use(passportRouter);

// Audit & Provenance Trail
apiRouter.use(auditRouter);

// External Verification Adapters
apiRouter.use(adapterRouter);
