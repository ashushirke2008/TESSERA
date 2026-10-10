package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
)

// Asset Status Constants
const (
	StatusDraft               = "DRAFT"
	StatusRegistered          = "REGISTERED"
	StatusPendingVerification = "PENDING_VERIFICATION"
	StatusVerified            = "VERIFIED"
	StatusApproved            = "APPROVED"
	StatusTokenized           = "TOKENIZED"
	StatusRetired             = "RETIRED"
	StatusRejected            = "REJECTED"
)

// Supported Asset Types
const (
	TypeLand    = "LAND"
	TypeVehicle = "VEHICLE"
	TypeGrain   = "GRAIN"
)

// Roles
const (
	RoleIssuerRegistrar   = "ISSUER_REGISTRAR"
	RoleVerifier          = "VERIFIER"
	RoleInvestorBuyer     = "INVESTOR_BUYER"
	RoleComplianceOfficer = "COMPLIANCE_OFFICER"
	RoleAuditor           = "AUDITOR"
	RoleAdministrator     = "ADMINISTRATOR"
)

// EvidenceReference records off-chain MinIO storage & SHA-256 integrity digest
type EvidenceReference struct {
	EvidenceID   string `json:"evidenceId"`
	HashSHA256   string `json:"hashSha256"`
	StorageURI   string `json:"storageUri"`
	DocType      string `json:"docType"`
	SubmittedBy  string `json:"submittedBy"`
	Timestamp    int64  `json:"timestamp"`
}

// ValuationRecord represents a formal valuation on-chain with freshness threshold
type ValuationRecord struct {
	AssetID            string  `json:"assetId"`
	Source             string  `json:"source"`
	Amount             float64 `json:"amount"`
	Currency           string  `json:"currency"`
	Methodology        string  `json:"methodology"`
	EffectiveTimestamp int64   `json:"effectiveTimestamp"`
	ExpiryTimestamp    int64   `json:"expiryTimestamp"`
	IsStale            bool    `json:"isStale"`
}

// Claim represents an attestation or third-party claim against an asset
type Claim struct {
	ClaimID         string   `json:"claimId"`
	AssetID         string   `json:"assetId"`
	ClaimType       string   `json:"claimType"`
	Claimant        string   `json:"claimant"`
	Status          string   `json:"status"` // SUBMITTED, ACCEPTED, REJECTED, EXPIRED
	RejectionReason string   `json:"rejectionReason,omitempty"`
	EvidenceIDs     []string `json:"evidenceIds"`
	SubmittedAt     int64    `json:"submittedAt"`
	ReviewedAt      int64    `json:"reviewedAt,omitempty"`
	ReviewedBy      string   `json:"reviewedBy,omitempty"`
}

// Approval records an endorsement decision in an M-of-N governance workflow
type Approval struct {
	ApprovalID       string `json:"approvalId"`
	AssetID          string `json:"assetId"`
	Action           string `json:"action"` // REGISTRATION, TOKEN_ISSUANCE
	ApproverRole     string `json:"approverRole"`
	ApproverIdentity string `json:"approverIdentity"`
	Decision         string `json:"decision"` // APPROVED, REJECTED
	Comments         string `json:"comments"`
	Timestamp        int64  `json:"timestamp"`
}

// Token represents fractionalized holdings bound to an asset
type Token struct {
	TokenID           string            `json:"tokenId"`
	AssetID           string            `json:"assetId"`
	TotalSupply       uint64            `json:"totalSupply"`
	CirculatingSupply uint64            `json:"circulatingSupply"`
	Symbol            string            `json:"symbol"`
	Status            string            `json:"status"` // ACTIVE, PAUSED, RETIRED
	Holdings          map[string]uint64 `json:"holdings"`
	IsRestricted      bool              `json:"isRestricted"`
}

// Pledge represents an active encumbrance/lien on an asset
type Pledge struct {
	PledgeID          string `json:"pledgeId"`
	AssetID           string `json:"assetId"`
	Lender            string `json:"lender"`
	Borrower          string `json:"borrower"`
	Status            string `json:"status"` // ACTIVE, RELEASED
	AmountPledged     uint64 `json:"amountPledged"`
	CreatedTimestamp  int64  `json:"createdTimestamp"`
	ReleasedTimestamp int64  `json:"releasedTimestamp,omitempty"`
}

// TransferPolicy defines rules for transfers
type TransferPolicy struct {
	PolicyID                   string `json:"policyId"`
	Version                    string `json:"version"`
	AssetType                  string `json:"assetType"`
	RequireKYC                 bool   `json:"requireKyc"`
	MaxHoldingPerInvestor      uint64 `json:"maxHoldingPerInvestor"`
	MinValuationFreshnessHours int    `json:"minValuationFreshnessHours"`
	IsActive                   bool   `json:"isActive"`
}

// TransferSimulationResult captures read-only evaluation without ledger mutation
type TransferSimulationResult struct {
	Allowed         bool     `json:"allowed"`
	ReasonCodes     []string `json:"reasonCodes"`
	AssetStatus     string   `json:"assetStatus"`
	ValuationValid  bool     `json:"valuationValid"`
	PledgeActive    bool     `json:"pledgeActive"`
	PolicyCompliant bool     `json:"policyCompliant"`
	Timestamp       int64    `json:"timestamp"`
}

// AssetPassport is a public, privacy-preserving view of the asset
type AssetPassport struct {
	PassportID             string  `json:"passportId"`
	AssetID                string  `json:"assetId"`
	AssetType              string  `json:"assetType"`
	Name                   string  `json:"name"`
	Status                 string  `json:"status"`
	FingerprintNormalized  string  `json:"fingerprintNormalized"`
	EvidenceCount          int     `json:"evidenceCount"`
	LatestValuation        float64 `json:"latestValuation"`
	Currency               string  `json:"currency"`
	IssuedAt               int64   `json:"issuedAt"`
	PublicProofHash        string  `json:"publicProofHash"`
}

// Asset represents the core ledger entity in world-state
type Asset struct {
	AssetID          string              `json:"assetId"`
	AssetType        string              `json:"assetType"`
	TemplateVersion  string              `json:"templateVersion"`
	Name             string              `json:"name"`
	Owner            string              `json:"owner"`
	Custodian        string              `json:"custodian"`
	Status           string              `json:"status"`
	DeclaredValue    float64             `json:"declaredValue"`
	Currency         string              `json:"currency"`
	Fingerprint      string              `json:"fingerprint"`
	Metadata         map[string]string   `json:"metadata"`
	EvidenceHashes   []EvidenceReference `json:"evidenceHashes"`
	ActiveValuation  *ValuationRecord    `json:"activeValuation,omitempty"`
	ActivePledgeID   string              `json:"activePledgeId,omitempty"`
	TokenID          string              `json:"tokenId,omitempty"`
	CreatedTimestamp int64               `json:"createdTimestamp"`
	UpdatedTimestamp int64               `json:"updatedTimestamp"`
}

// Template validation rules
var permittedMetadataFields = map[string]map[string]bool{
	TypeLand: {
		"cadastralId":  true,
		"jurisdiction": true,
		"areaSqMeters": true,
		"zoning":       true,
		"coordinates":  true,
	},
	TypeVehicle: {
		"vin":          true,
		"make":         true,
		"model":        true,
		"year":         true,
		"odometerKm":   true,
		"engineNumber": true,
	},
	TypeGrain: {
		"siloId":          true,
		"commodityGrade":  true,
		"metricTons":      true,
		"cropYear":        true,
		"moisturePercent": true,
		"proteinPercent":  true,
	},
}

// NormalizeFingerprint normalizes type-specific fingerprints deterministically
func NormalizeFingerprint(assetType, raw string) (string, error) {
	trimmed := strings.ToUpper(strings.TrimSpace(raw))
	if trimmed == "" {
		return "", fmt.Errorf("fingerprint cannot be empty")
	}

	switch assetType {
	case TypeLand:
		// Format: LAND:JURISDICTION:CADASTRAL_ID
		return fmt.Sprintf("LAND:%s", strings.ReplaceAll(trimmed, " ", "_")), nil
	case TypeVehicle:
		// VIN standard 17 alphanumeric chars
		cleaned := strings.ReplaceAll(trimmed, "-", "")
		cleaned = strings.ReplaceAll(cleaned, " ", "")
		return fmt.Sprintf("VIN:%s", cleaned), nil
	case TypeGrain:
		// Format: GRAIN:SILO:BATCH
		return fmt.Sprintf("GRAIN:%s", strings.ReplaceAll(trimmed, " ", "_")), nil
	default:
		return "", fmt.Errorf("unsupported asset type: %s", assetType)
	}
}

// ValidateTemplateMetadata verifies that all supplied metadata fields are permitted
func ValidateTemplateMetadata(assetType string, metadata map[string]string) error {
	permitted, exists := permittedMetadataFields[assetType]
	if !exists {
		return fmt.Errorf("unsupported asset type: %s", assetType)
	}

	for k := range metadata {
		if !permitted[k] {
			return fmt.Errorf("unpermitted metadata field '%s' for asset type %s", k, assetType)
		}
	}
	return nil
}

// ComputePublicProofHash calculates deterministic public hash for passport
func (a *Asset) ComputePublicProofHash() string {
	h := sha256.New()
	h.Write([]byte(fmt.Sprintf("%s|%s|%s|%s|%f|%d", a.AssetID, a.AssetType, a.Fingerprint, a.Owner, a.DeclaredValue, a.CreatedTimestamp)))
	return hex.EncodeToString(h.Sum(nil))
}
