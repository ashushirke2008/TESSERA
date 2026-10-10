import { Router } from 'express';
import QRCode from 'qrcode';
import { ledgerService } from '../services/ledger.service';
import { AppError } from '../middleware/errorHandler';

export const passportRouter = Router();

// Public privacy-preserving verification endpoint
passportRouter.get('/passport/:id', (req, res, next) => {
  try {
    const passport = ledgerService.getAssetPassport(req.params.id);
    res.status(200).json({
      success: true,
      data: passport,
    });
  } catch (err) {
    next(new AppError(404, 'PASSPORT_NOT_FOUND', `Asset Passport for '${req.params.id}' not found`));
  }
});

// QR Code image generator for passport
passportRouter.get('/passport/:id/qr', async (req, res, next) => {
  try {
    const passport = ledgerService.getAssetPassport(req.params.id);
    const verificationUrl = `${req.protocol}://${req.get('host')}/api/passport/${passport.assetId}`;

    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      color: {
        dark: '#0a0d14',
        light: '#ffffff',
      },
    });

    res.status(200).json({
      success: true,
      data: {
        passportId: passport.passportId,
        verificationUrl,
        qrDataUrl,
        publicProofHash: passport.publicProofHash,
      },
    });
  } catch (err) {
    next(new AppError(500, 'QR_GENERATION_FAILED', (err as Error).message));
  }
});
