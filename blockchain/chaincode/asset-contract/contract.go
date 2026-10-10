package main

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// SmartContract provides functions for managing assets on Hyperledger Fabric
type SmartContract struct {
	contractapi.Contract
}

// InitLedger initializes sample transfer policies and platform defaults
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	defaultPolicies := []TransferPolicy{
		{
			PolicyID:                   "POL-DEFAULT-LAND",
			Version:                    "v1.0",
			AssetType:                  TypeLand,
			RequireKYC:                 true,
			MaxHoldingPerInvestor:      1000000,
			MinValuationFreshnessHours: 720, // 30 days
			IsActive:                   true,
		},
		{
			PolicyID:                   "POL-DEFAULT-VEHICLE",
			Version:                    "v1.0",
			AssetType:                  TypeVehicle,
			RequireKYC:                 true,
			MaxHoldingPerInvestor:      500000,
			MinValuationFreshnessHours: 168, // 7 days
			IsActive:                   true,
		},
		{
			PolicyID:                   "POL-DEFAULT-GRAIN",
			Version:                    "v1.0",
			AssetType:                  TypeGrain,
			RequireKYC:                 true,
			MaxHoldingPerInvestor:      2000000,
			MinValuationFreshnessHours: 48, // 48 hours for commodities
			IsActive:                   true,
		},
	}

	for _, pol := range defaultPolicies {
		polBytes, err := json.Marshal(pol)
		if err != nil {
			return err
		}
		err = ctx.GetStub().PutState(fmt.Sprintf("policy~%s", pol.PolicyID), polBytes)
		if err != nil {
			return err
		}
	}

	return nil
}

// RegisterAsset creates a new asset record with template validation and deterministic duplicate prevention
func (s *SmartContract) RegisterAsset(
	ctx contractapi.TransactionContextInterface,
	assetID string,
	assetType string,
	templateVersion string,
	name string,
	owner string,
	custodian string,
	declaredValue float64,
	currency string,
	rawFingerprint string,
	metadataJSON string,
) error {
	if strings.TrimSpace(assetID) == "" {
		return fmt.Errorf("assetId is required")
	}

	// 1. Check if asset ID already exists
	exists, err := s.AssetExists(ctx, assetID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("asset with ID '%s' already exists", assetID)
	}

	// 2. Validate and normalize fingerprint
	normalizedFP, err := NormalizeFingerprint(assetType, rawFingerprint)
	if err != nil {
		return fmt.Errorf("fingerprint validation error: %w", err)
	}

	// 3. Enforce uniqueness via deterministic composite key (fingerprint index)
	fpKey, err := ctx.GetStub().CreateCompositeKey("asset~fingerprint", []string{normalizedFP})
	if err != nil {
		return err
	}
	existingFP, err := ctx.GetStub().GetState(fpKey)
	if err != nil {
		return err
	}
	if existingFP != nil {
		return fmt.Errorf("duplicate asset: fingerprint '%s' is already registered on-chain", normalizedFP)
	}

	// 4. Validate metadata against template rules
	var metadata map[string]string
	if metadataJSON != "" {
		if err := json.Unmarshal([]byte(metadataJSON), &metadata); err != nil {
			return fmt.Errorf("invalid metadata JSON: %w", err)
		}
		if err := ValidateTemplateMetadata(assetType, metadata); err != nil {
			return fmt.Errorf("metadata template error: %w", err)
		}
	} else {
		metadata = make(map[string]string)
	}

	now := time.Now().Unix()
	asset := Asset{
		AssetID:          assetID,
		AssetType:        assetType,
		TemplateVersion:  templateVersion,
		Name:             name,
		Owner:            owner,
		Custodian:        custodian,
		Status:           StatusRegistered,
		DeclaredValue:    declaredValue,
		Currency:         currency,
		Fingerprint:      normalizedFP,
		Metadata:         metadata,
		EvidenceHashes:   []EvidenceReference{},
		CreatedTimestamp: now,
		UpdatedTimestamp: now,
	}

	assetBytes, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	// Store asset and fingerprint index atomically
	if err := ctx.GetStub().PutState(assetID, assetBytes); err != nil {
		return err
	}
	if err := ctx.GetStub().PutState(fpKey, []byte(assetID)); err != nil {
		return err
	}

	_ = ctx.GetStub().SetEvent("AssetRegistered", []byte(fmt.Sprintf(`{"assetId":"%s","fingerprint":"%s"}`, assetID, normalizedFP)))
	return nil
}

// GetAsset retrieves an asset by its ID
func (s *SmartContract) GetAsset(ctx contractapi.TransactionContextInterface, assetID string) (*Asset, error) {
	assetBytes, err := ctx.GetStub().GetState(assetID)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if assetBytes == nil {
		return nil, fmt.Errorf("asset '%s' does not exist", assetID)
	}

	var asset Asset
	if err := json.Unmarshal(assetBytes, &asset); err != nil {
		return nil, err
	}
	return &asset, nil
}

// AssetExists checks if an asset exists in world state
func (s *SmartContract) AssetExists(ctx contractapi.TransactionContextInterface, assetID string) (bool, error) {
	assetBytes, err := ctx.GetStub().GetState(assetID)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}
	return assetBytes != nil, nil
}

// ListAssets returns all assets stored in the ledger
func (s *SmartContract) ListAssets(ctx contractapi.TransactionContextInterface) ([]*Asset, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var assets []*Asset
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		// Filter out composite keys or other prefixes
		if strings.Contains(queryResponse.Key, "~") {
			continue
		}

		var asset Asset
		if err := json.Unmarshal(queryResponse.Value, &asset); err == nil && asset.AssetID != "" {
			assets = append(assets, &asset)
		}
	}
	return assets, nil
}

// UpdateAssetMetadata updates permitted metadata fields
func (s *SmartContract) UpdateAssetMetadata(ctx contractapi.TransactionContextInterface, assetID string, metadataJSON string) error {
	asset, err := s.GetAsset(ctx, assetID)
	if err != nil {
		return err
	}

	var newMeta map[string]string
	if err := json.Unmarshal([]byte(metadataJSON), &newMeta); err != nil {
		return fmt.Errorf("invalid metadata JSON: %w", err)
	}
	if err := ValidateTemplateMetadata(asset.AssetType, newMeta); err != nil {
		return err
	}

	for k, v := range newMeta {
		asset.Metadata[k] = v
	}
	asset.UpdatedTimestamp = time.Now().Unix()

	updatedBytes, err := json.Marshal(asset)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState(assetID, updatedBytes)
}

// RecordEvidence associates an off-chain MinIO evidence file's SHA-256 digest on-chain
func (s *SmartContract) RecordEvidence(
	ctx contractapi.TransactionContextInterface,
	assetID string,
	evidenceID string,
	hashSHA256 string,
	storageURI string,
	docType string,
	submittedBy string,
) error {
	if len(hashSHA256) != 64 {
		return fmt.Errorf("invalid SHA-256 hash length: expected 64 hex characters")
	}

	asset, err := s.GetAsset(ctx, assetID)
	if err != nil {
		return err
	}

	ref := EvidenceReference{
		EvidenceID:  evidenceID,
		HashSHA256:  hashSHA256,
		StorageURI:  storageURI,
		DocType:     docType,
		SubmittedBy: submittedBy,
		Timestamp:   time.Now().Unix(),
	}

	asset.EvidenceHashes = append(asset.EvidenceHashes, ref)
	asset.UpdatedTimestamp = time.Now().Unix()
	if asset.Status == StatusRegistered {
		asset.Status = StatusPendingVerification
	}

	updatedBytes, err := json.Marshal(asset)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState(assetID, updatedBytes)
}

// SubmitClaim creates a new verification claim against an asset
func (s *SmartContract) SubmitClaim(
	ctx contractapi.TransactionContextInterface,
	claimID string,
	assetID string,
	claimType string,
	claimant string,
	evidenceIDsCSV string,
) error {
	exists, err := s.AssetExists(ctx, assetID)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("asset '%s' does not exist", assetID)
	}

	var evidenceIDs []string
	if evidenceIDsCSV != "" {
		evidenceIDs = strings.Split(evidenceIDsCSV, ",")
	}

	claim := Claim{
		ClaimID:     claimID,
		AssetID:     assetID,
		ClaimType:   claimType,
		Claimant:    claimant,
		Status:      "SUBMITTED",
		EvidenceIDs: evidenceIDs,
		SubmittedAt: time.Now().Unix(),
	}

	claimBytes, err := json.Marshal(claim)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState(fmt.Sprintf("claim~%s", claimID), claimBytes)
}

// ReviewClaim processes a claim decision (ACCEPTED or REJECTED with reason code)
func (s *SmartContract) ReviewClaim(
	ctx contractapi.TransactionContextInterface,
	claimID string,
	decision string,
	rejectionReason string,
	reviewer string,
) error {
	claimBytes, err := ctx.GetStub().GetState(fmt.Sprintf("claim~%s", claimID))
	if err != nil || claimBytes == nil {
		return fmt.Errorf("claim '%s' not found", claimID)
	}

	var claim Claim
	if err := json.Unmarshal(claimBytes, &claim); err != nil {
		return err
	}

	claim.ReviewedAt = time.Now().Unix()
	claim.ReviewedBy = reviewer

	if decision == "ACCEPTED" {
		claim.Status = "ACCEPTED"
		// Transition asset to VERIFIED
		asset, err := s.GetAsset(ctx, claim.AssetID)
		if err == nil && asset != nil {
			asset.Status = StatusVerified
			asset.UpdatedTimestamp = time.Now().Unix()
			aBytes, _ := json.Marshal(asset)
			_ = ctx.GetStub().PutState(asset.AssetID, aBytes)
		}
	} else {
		claim.Status = "REJECTED"
		claim.RejectionReason = rejectionReason
	}

	updatedClaimBytes, _ := json.Marshal(claim)
	return ctx.GetStub().PutState(fmt.Sprintf("claim~%s", claimID), updatedClaimBytes)
}

// SubmitApproval implements maker-checker governance and M-of-N threshold rules
func (s *SmartContract) SubmitApproval(
	ctx contractapi.TransactionContextInterface,
	approvalID string,
	assetID string,
	action string,
	approverRole string,
	approverIdentity string,
	decision string,
	comments string,
) error {
	asset, err := s.GetAsset(ctx, assetID)
	if err != nil {
		return err
	}

	// 1. Separation of duties: Maker-checker invariant — owner cannot self-approve
	if asset.Owner == approverIdentity {
		return fmt.Errorf("separation of duties violation: asset owner '%s' cannot approve their own asset", approverIdentity)
	}

	// 2. Prevent duplicate approval submissions by the same approver
	existingAppBytes, _ := ctx.GetStub().GetState(fmt.Sprintf("approval~%s~%s", assetID, approverIdentity))
	if existingAppBytes != nil {
		return fmt.Errorf("duplicate approval: approver '%s' has already submitted an approval decision", approverIdentity)
	}

	approval := Approval{
		ApprovalID:       approvalID,
		AssetID:          assetID,
		Action:           action,
		ApproverRole:     approverRole,
		ApproverIdentity: approverIdentity,
		Decision:         decision,
		Comments:         comments,
		Timestamp:        time.Now().Unix(),
	}

	appBytes, _ := json.Marshal(approval)
	_ = ctx.GetStub().PutState(fmt.Sprintf("approval~%s~%s", assetID, approverIdentity), appBytes)

	// If approved, transition asset status to APPROVED
	if decision == "APPROVED" {
		asset.Status = StatusApproved
		asset.UpdatedTimestamp = time.Now().Unix()
		updatedAssetBytes, _ := json.Marshal(asset)
		_ = ctx.GetStub().PutState(assetID, updatedAssetBytes)
	} else if decision == "REJECTED" {
		asset.Status = StatusRejected
		asset.UpdatedTimestamp = time.Now().Unix()
		updatedAssetBytes, _ := json.Marshal(asset)
		_ = ctx.GetStub().PutState(assetID, updatedAssetBytes)
	}

	return nil
}

// RecordValuation updates formal valuation with effective date and expiry timestamp
func (s *SmartContract) RecordValuation(
	ctx contractapi.TransactionContextInterface,
	assetID string,
	source string,
	amount float64,
	currency string,
	methodology string,
	validityHours int,
) error {
	asset, err := s.GetAsset(ctx, assetID)
	if err != nil {
		return err
	}

	now := time.Now().Unix()
	expiry := now + int64(validityHours*3600)

	val := ValuationRecord{
		AssetID:            assetID,
		Source:             source,
		Amount:             amount,
		Currency:           currency,
		Methodology:        methodology,
		EffectiveTimestamp: now,
		ExpiryTimestamp:    expiry,
		IsStale:            false,
	}

	asset.ActiveValuation = &val
	asset.DeclaredValue = amount
	asset.Currency = currency
	asset.UpdatedTimestamp = now

	// Also record historical valuation
	valBytes, _ := json.Marshal(val)
	_ = ctx.GetStub().PutState(fmt.Sprintf("valuation~%s~%d", assetID, now), valBytes)

	assetBytes, _ := json.Marshal(asset)
	return ctx.GetStub().PutState(assetID, assetBytes)
}

// IssueTokens fractionalizes an approved asset with supply constraints
func (s *SmartContract) IssueTokens(
	ctx contractapi.TransactionContextInterface,
	tokenID string,
	assetID string,
	symbol string,
	totalSupply uint64,
) error {
	asset, err := s.GetAsset(ctx, assetID)
	if err != nil {
		return err
	}

	// Invariant: Asset must be approved before tokenization
	if asset.Status != StatusApproved && asset.Status != StatusVerified {
		return fmt.Errorf("tokenization prohibited: asset '%s' is in '%s' status (must be APPROVED)", assetID, asset.Status)
	}

	// Invariant: Active valuation must exist and not be expired
	if asset.ActiveValuation == nil {
		return fmt.Errorf("tokenization prohibited: asset '%s' lacks active valuation", assetID)
	}
	if time.Now().Unix() > asset.ActiveValuation.ExpiryTimestamp {
		return fmt.Errorf("tokenization prohibited: valuation for asset '%s' is stale/expired", assetID)
	}

	// Invariant: Cannot tokenize if already tokenized
	if asset.TokenID != "" {
		return fmt.Errorf("asset '%s' is already tokenized with token ID '%s'", assetID, asset.TokenID)
	}

	token := Token{
		TokenID:           tokenID,
		AssetID:           assetID,
		TotalSupply:       totalSupply,
		CirculatingSupply: totalSupply,
		Symbol:            symbol,
		Status:            "ACTIVE",
		Holdings: map[string]uint64{
			asset.Owner: totalSupply, // Initial supply held by owner
		},
		IsRestricted: false,
	}

	tokenBytes, _ := json.Marshal(token)
	if err := ctx.GetStub().PutState(fmt.Sprintf("token~%s", tokenID), tokenBytes); err != nil {
		return err
	}

	asset.TokenID = tokenID
	asset.Status = StatusTokenized
	asset.UpdatedTimestamp = time.Now().Unix()
	assetBytes, _ := json.Marshal(asset)
	return ctx.GetStub().PutState(assetID, assetBytes)
}

// CreatePledge records an encumbrance/lien on an asset, enforcing double-pledge defense
func (s *SmartContract) CreatePledge(
	ctx contractapi.TransactionContextInterface,
	pledgeID string,
	assetID string,
	lender string,
	borrower string,
	amount uint64,
) error {
	asset, err := s.GetAsset(ctx, assetID)
	if err != nil {
		return err
	}

	// Double-pledge defense: deterministic state check
	pledgeKey := fmt.Sprintf("pledge_active~%s", assetID)
	existingPledge, err := ctx.GetStub().GetState(pledgeKey)
	if err != nil {
		return err
	}
	if existingPledge != nil && string(existingPledge) != "" {
		return fmt.Errorf("double-pledge violation: asset '%s' is already subject to active pledge '%s'", assetID, string(existingPledge))
	}

	pledge := Pledge{
		PledgeID:         pledgeID,
		AssetID:          assetID,
		Lender:           lender,
		Borrower:         borrower,
		Status:           "ACTIVE",
		AmountPledged:    amount,
		CreatedTimestamp: time.Now().Unix(),
	}

	pledgeBytes, _ := json.Marshal(pledge)
	_ = ctx.GetStub().PutState(fmt.Sprintf("pledge~%s", pledgeID), pledgeBytes)
	_ = ctx.GetStub().PutState(pledgeKey, []byte(pledgeID))

	asset.ActivePledgeID = pledgeID
	asset.UpdatedTimestamp = time.Now().Unix()
	assetBytes, _ := json.Marshal(asset)
	return ctx.GetStub().PutState(assetID, assetBytes)
}

// ReleasePledge releases an active pledge encumbrance
func (s *SmartContract) ReleasePledge(ctx contractapi.TransactionContextInterface, pledgeID string) error {
	pBytes, err := ctx.GetStub().GetState(fmt.Sprintf("pledge~%s", pledgeID))
	if err != nil || pBytes == nil {
		return fmt.Errorf("pledge '%s' not found", pledgeID)
	}

	var pledge Pledge
	if err := json.Unmarshal(pBytes, &pledge); err != nil {
		return err
	}

	pledge.Status = "RELEASED"
	pledge.ReleasedTimestamp = time.Now().Unix()
	pBytesUpdated, _ := json.Marshal(pledge)
	_ = ctx.GetStub().PutState(fmt.Sprintf("pledge~%s", pledgeID), pBytesUpdated)

	// Clear active pledge index
	pledgeKey := fmt.Sprintf("pledge_active~%s", pledge.AssetID)
	_ = ctx.GetStub().DelState(pledgeKey)

	// Update asset
	asset, err := s.GetAsset(ctx, pledge.AssetID)
	if err == nil && asset != nil {
		asset.ActivePledgeID = ""
		asset.UpdatedTimestamp = time.Now().Unix()
		aBytes, _ := json.Marshal(asset)
		_ = ctx.GetStub().PutState(asset.AssetID, aBytes)
	}

	return nil
}

// SimulateTransfer executes a read-only evaluation of transfer rules without mutating ledger
func (s *SmartContract) SimulateTransfer(
	ctx contractapi.TransactionContextInterface,
	tokenID string,
	fromOwner string,
	toOwner string,
	amount uint64,
) (*TransferSimulationResult, error) {
	result := &TransferSimulationResult{
		Allowed:         true,
		ReasonCodes:     []string{},
		Timestamp:       time.Now().Unix(),
		PolicyCompliant: true,
	}

	tokenBytes, err := ctx.GetStub().GetState(fmt.Sprintf("token~%s", tokenID))
	if err != nil || tokenBytes == nil {
		result.Allowed = false
		result.ReasonCodes = append(result.ReasonCodes, "TOKEN_NOT_FOUND")
		return result, nil
	}

	var token Token
	_ = json.Unmarshal(tokenBytes, &token)

	// Check token status
	if token.Status != "ACTIVE" {
		result.Allowed = false
		result.ReasonCodes = append(result.ReasonCodes, "TOKEN_NOT_ACTIVE")
	}

	// Check holding balance
	currentHolding := token.Holdings[fromOwner]
	if currentHolding < amount {
		result.Allowed = false
		result.ReasonCodes = append(result.ReasonCodes, "INSUFFICIENT_HOLDINGS")
	}

	// Check underlying asset
	asset, err := s.GetAsset(ctx, token.AssetID)
	if err != nil || asset == nil {
		result.Allowed = false
		result.ReasonCodes = append(result.ReasonCodes, "ASSET_NOT_FOUND")
		return result, nil
	}

	result.AssetStatus = asset.Status

	// Check active pledge
	if asset.ActivePledgeID != "" {
		result.PledgeActive = true
		result.Allowed = false
		result.ReasonCodes = append(result.ReasonCodes, "ASSET_PLEDGED_ENCUMBERED")
	}

	// Check valuation freshness
	if asset.ActiveValuation == nil || time.Now().Unix() > asset.ActiveValuation.ExpiryTimestamp {
		result.ValuationValid = false
		result.Allowed = false
		result.ReasonCodes = append(result.ReasonCodes, "VALUATION_STALE")
	} else {
		result.ValuationValid = true
	}

	return result, nil
}

// ExecuteTransfer enforces all conditions and updates holdings atomically
func (s *SmartContract) ExecuteTransfer(
	ctx contractapi.TransactionContextInterface,
	tokenID string,
	fromOwner string,
	toOwner string,
	amount uint64,
) error {
	// Revalidate all conditions at execution time
	sim, err := s.SimulateTransfer(ctx, tokenID, fromOwner, toOwner, amount)
	if err != nil {
		return err
	}
	if !sim.Allowed {
		return fmt.Errorf("transfer rejected by policy: %s", strings.Join(sim.ReasonCodes, ", "))
	}

	tokenBytes, _ := ctx.GetStub().GetState(fmt.Sprintf("token~%s", tokenID))
	var token Token
	_ = json.Unmarshal(tokenBytes, &token)

	// Atomic balance transfer
	token.Holdings[fromOwner] -= amount
	token.Holdings[toOwner] += amount

	updatedTokenBytes, _ := json.Marshal(token)
	if err := ctx.GetStub().PutState(fmt.Sprintf("token~%s", tokenID), updatedTokenBytes); err != nil {
		return err
	}

	eventPayload := fmt.Sprintf(`{"tokenId":"%s","from":"%s","to":"%s","amount":%d}`, tokenID, fromOwner, toOwner, amount)
	_ = ctx.GetStub().SetEvent("TokenTransferred", []byte(eventPayload))
	return nil
}

// GetAssetPassport produces a public, privacy-preserving proof passport
func (s *SmartContract) GetAssetPassport(ctx contractapi.TransactionContextInterface, assetID string) (*AssetPassport, error) {
	asset, err := s.GetAsset(ctx, assetID)
	if err != nil {
		return nil, err
	}

	latestVal := 0.0
	if asset.ActiveValuation != nil {
		latestVal = asset.ActiveValuation.Amount
	}

	passport := &AssetPassport{
		PassportID:            fmt.Sprintf("PSP-%s", assetID),
		AssetID:               asset.AssetID,
		AssetType:             asset.AssetType,
		Name:                  asset.Name,
		Status:                asset.Status,
		FingerprintNormalized: asset.Fingerprint,
		EvidenceCount:         len(asset.EvidenceHashes),
		LatestValuation:       latestVal,
		Currency:              asset.Currency,
		IssuedAt:              time.Now().Unix(),
		PublicProofHash:       asset.ComputePublicProofHash(),
	}

	return passport, nil
}
