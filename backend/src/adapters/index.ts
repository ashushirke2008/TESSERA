import crypto from 'crypto';

export type AdapterScenario =
  | 'SUCCESS'
  | 'NOT_FOUND'
  | 'INVALID'
  | 'STALE'
  | 'EXPIRED'
  | 'FAILED'
  | 'TIMEOUT'
  | 'UNAVAILABLE';

export interface AdapterVerificationResult {
  service: 'government-registry' | 'valuation-service' | 'insurance-service' | 'inspection-service';
  scenario: AdapterScenario;
  success: boolean;
  timestamp: string;
  provenance: {
    registryAuthority: string;
    attestationHash: string;
    protocolVersion: string;
  };
  details: Record<string, unknown>;
  reasonCode?: string;
  message: string;
}

export class ExternalAdaptersService {
  public async verify(
    service: 'government-registry' | 'valuation-service' | 'insurance-service' | 'inspection-service',
    assetId: string,
    scenario: AdapterScenario = 'SUCCESS'
  ): Promise<AdapterVerificationResult> {
    const timestamp = new Date().toISOString();
    const attestationHash = crypto.createHash('sha256').update(`${service}:${assetId}:${scenario}:${timestamp}`).digest('hex');

    if (scenario === 'TIMEOUT') {
      throw new Error(`External adapter '${service}' request timed out after 30000ms`);
    }

    if (scenario === 'UNAVAILABLE') {
      return {
        service,
        scenario,
        success: false,
        timestamp,
        provenance: {
          registryAuthority: 'UPSTREAM_GATEWAY',
          attestationHash,
          protocolVersion: 'v2.1',
        },
        reasonCode: 'ADAPTER_SERVICE_UNAVAILABLE',
        message: `Upstream gateway for ${service} returned 503 Service Unavailable`,
        details: { httpStatus: 503, retryAfterSec: 60 },
      };
    }

    if (scenario === 'NOT_FOUND') {
      return {
        service,
        scenario,
        success: false,
        timestamp,
        provenance: {
          registryAuthority: 'OFFICIAL_REGISTRAR',
          attestationHash,
          protocolVersion: 'v2.1',
        },
        reasonCode: 'RECORD_NOT_FOUND',
        message: `No active municipal or statutory registration found for asset '${assetId}'`,
        details: { assetId, searchScope: 'NATIONAL_DATABASE' },
      };
    }

    if (scenario === 'EXPIRED') {
      return {
        service,
        scenario,
        success: false,
        timestamp,
        provenance: {
          registryAuthority: 'UNDERWRITING_PARTNER',
          attestationHash,
          protocolVersion: 'v2.1',
        },
        reasonCode: 'POLICY_EXPIRED',
        message: `Insurance coverage policy for '${assetId}' expired on 2026-08-31`,
        details: { expiryDate: '2026-08-31', coverageAmount: 0 },
      };
    }

    if (scenario === 'STALE') {
      return {
        service,
        scenario,
        success: false,
        timestamp,
        provenance: {
          registryAuthority: 'APPRAISAL_BUREAU',
          attestationHash,
          protocolVersion: 'v2.1',
        },
        reasonCode: 'VALUATION_STALE',
        message: `Most recent certified valuation exceeded 90-day threshold (conducted 2025-11-15)`,
        details: { valuationDate: '2025-11-15', ageInDays: 329 },
      };
    }

    if (scenario === 'FAILED') {
      return {
        service,
        scenario,
        success: false,
        timestamp,
        provenance: {
          registryAuthority: 'LICENSED_INSPECTOR',
          attestationHash,
          protocolVersion: 'v2.1',
        },
        reasonCode: 'PHYSICAL_INSPECTION_FAILED',
        message: `Asset physical inspection revealed critical mechanical defects and structural non-compliance`,
        details: { defectsFound: ['Structural crack on foundation', 'Odometer rollback detected'] },
      };
    }

    // Default: SUCCESS scenario
    switch (service) {
      case 'government-registry':
        return {
          service,
          scenario,
          success: true,
          timestamp,
          provenance: {
            registryAuthority: 'STATE_CADASTRAL_AND_TITLE_OFFICE',
            attestationHash,
            protocolVersion: 'v2.1',
          },
          message: 'Title deed verified: Clean title with zero registered statutory liens',
          details: {
            titleDeedNumber: 'TD-9021-X',
            jurisdiction: 'CALIFORNIA_DISTRICT_4',
            ownerVerified: true,
            lienCount: 0,
          },
        };

      case 'valuation-service':
        return {
          service,
          scenario,
          success: true,
          timestamp,
          provenance: {
            registryAuthority: 'CERTIFIED_APPRAISERS_GUILD',
            attestationHash,
            protocolVersion: 'v2.1',
          },
          message: 'Independent appraisal quote confirmed: Fair market valuation $2,450,000 USD',
          details: {
            appraisedValue: 2450000,
            currency: 'USD',
            methodology: 'DISCOUNTED_CASH_FLOW_AND_COMPS',
            validUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
          },
        };

      case 'insurance-service':
        return {
          service,
          scenario,
          success: true,
          timestamp,
          provenance: {
            registryAuthority: 'LLOYDS_SYNDICATE_UNDERWRITERS',
            attestationHash,
            protocolVersion: 'v2.1',
          },
          message: 'Comprehensive asset insurance policy active with full indemnity coverage',
          details: {
            policyNumber: 'POL-ALL-RISK-2026-90',
            underwriter: 'Global Marine & Property Insurance Corp',
            coverageLimit: 3000000,
            currency: 'USD',
            active: true,
          },
        };

      case 'inspection-service':
        return {
          service,
          scenario,
          success: true,
          timestamp,
          provenance: {
            registryAuthority: 'SGS_GLOBAL_INSPECTION_SERVICES',
            attestationHash,
            protocolVersion: 'v2.1',
          },
          message: 'Physical surveyor inspection passed with Grade-A certification',
          details: {
            inspectionReportId: 'INSP-SGS-9921',
            inspectorLicense: 'US-INSP-8821',
            conditionRating: 'EXCELLENT',
            tamperingDetected: false,
          },
        };
    }
  }
}

export const externalAdaptersService = new ExternalAdaptersService();
