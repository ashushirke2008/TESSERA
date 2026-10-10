package main

import (
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/hyperledger/fabric-chaincode-go/v2/shim"
	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
	"github.com/hyperledger/fabric-protos-go-apiv2/ledger/queryresult"
)

// MockStub implements a simple in-memory shim.ChaincodeStubInterface for testing
type MockStub struct {
	shim.ChaincodeStubInterface
	state  map[string][]byte
	events map[string][]byte
}

func NewMockStub() *MockStub {
	return &MockStub{
		state:  make(map[string][]byte),
		events: make(map[string][]byte),
	}
}

func (m *MockStub) GetState(key string) ([]byte, error) {
	return m.state[key], nil
}

func (m *MockStub) PutState(key string, value []byte) error {
	m.state[key] = value
	return nil
}

func (m *MockStub) DelState(key string) error {
	delete(m.state, key)
	return nil
}

func (m *MockStub) SetEvent(name string, payload []byte) error {
	m.events[name] = payload
	return nil
}

func (m *MockStub) CreateCompositeKey(objectType string, attributes []string) (string, error) {
	return fmt.Sprintf("%s~%s", objectType, attributes[0]), nil
}

type mockIterator struct {
	items []queryresult.KV
	index int
}

func (it *mockIterator) HasNext() bool {
	return it.index < len(it.items)
}

func (it *mockIterator) Close() error {
	return nil
}

func (it *mockIterator) Next() (*queryresult.KV, error) {
	if !it.HasNext() {
		return nil, nil
	}
	item := it.items[it.index]
	it.index++
	return &item, nil
}

func (m *MockStub) GetStateByRange(startKey, endKey string) (shim.StateQueryIteratorInterface, error) {
	var items []queryresult.KV
	for k, v := range m.state {
		items = append(items, queryresult.KV{Key: k, Value: v})
	}
	return &mockIterator{items: items, index: 0}, nil
}

type MockContext struct {
	contractapi.TransactionContextInterface
	stub *MockStub
}

func (c *MockContext) GetStub() shim.ChaincodeStubInterface {
	return c.stub
}

func TestChaincodeLifecycle(t *testing.T) {
	contract := new(SmartContract)
	stub := NewMockStub()
	ctx := &MockContext{stub: stub}

	// 1. InitLedger
	if err := contract.InitLedger(ctx); err != nil {
		t.Fatalf("InitLedger failed: %v", err)
	}

	// 2. Register LAND Asset
	landMeta := `{"cadastralId":"CAD-9821","jurisdiction":"US-CA","areaSqMeters":"45000"}`
	err := contract.RegisterAsset(
		ctx,
		"AST-LAND-001",
		TypeLand,
		"v1.0",
		"Logistics Hub North",
		"owner1",
		"custodian1",
		1500000.0,
		"USD",
		"US-CA 9821",
		landMeta,
	)
	if err != nil {
		t.Fatalf("RegisterAsset failed: %v", err)
	}

	// 3. Test Duplicate Fingerprint Rejection
	err = contract.RegisterAsset(
		ctx,
		"AST-LAND-002",
		TypeLand,
		"v1.0",
		"Duplicate Land",
		"owner2",
		"custodian1",
		2000000.0,
		"USD",
		"US-CA 9821", // same fingerprint
		landMeta,
	)
	if err == nil {
		t.Fatalf("expected duplicate fingerprint registration to fail, but it succeeded")
	}

	// 4. Test Unpermitted Metadata Rejection
	badMeta := `{"cadastralId":"CAD-123","invalidField":"malicious"}`
	err = contract.RegisterAsset(
		ctx,
		"AST-LAND-003",
		TypeLand,
		"v1.0",
		"Bad Meta Land",
		"owner3",
		"custodian1",
		500000.0,
		"USD",
		"US-CA 9999",
		badMeta,
	)
	if err == nil {
		t.Fatalf("expected unpermitted metadata to fail template validation")
	}

	// 5. Record Evidence with SHA-256
	hash64 := "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
	err = contract.RecordEvidence(
		ctx,
		"AST-LAND-001",
		"EVD-001",
		hash64,
		"minio://tessera-evidence/deeds/deed-001.pdf",
		"DEED",
		"registrar_user",
	)
	if err != nil {
		t.Fatalf("RecordEvidence failed: %v", err)
	}

	// 6. Maker-Checker: Prevent Self-Approval
	err = contract.SubmitApproval(
		ctx,
		"APP-001",
		"AST-LAND-001",
		"REGISTRATION",
		RoleComplianceOfficer,
		"owner1", // same as owner!
		"APPROVED",
		"Self-approving my own asset",
	)
	if err == nil {
		t.Fatalf("expected self-approval to fail separation of duties check")
	}

	// 7. Legitimate Approver Approval
	err = contract.SubmitApproval(
		ctx,
		"APP-002",
		"AST-LAND-001",
		"REGISTRATION",
		RoleComplianceOfficer,
		"independent_compliance_officer",
		"APPROVED",
		"Title verified and approved",
	)
	if err != nil {
		t.Fatalf("valid approval failed: %v", err)
	}

	asset, err := contract.GetAsset(ctx, "AST-LAND-001")
	if err != nil || asset.Status != StatusApproved {
		t.Fatalf("asset status expected APPROVED, got: %s", asset.Status)
	}

	// 8. Record Valuation
	err = contract.RecordValuation(
		ctx,
		"AST-LAND-001",
		"CBRE_APPRAISAL_SERVICES",
		1600000.0,
		"USD",
		"DISCOUNTED_CASH_FLOW",
		720, // 30 days
	)
	if err != nil {
		t.Fatalf("RecordValuation failed: %v", err)
	}

	// 9. Issue Tokens
	err = contract.IssueTokens(
		ctx,
		"TKN-LAND-001",
		"AST-LAND-001",
		"LND1",
		100000,
	)
	if err != nil {
		t.Fatalf("IssueTokens failed: %v", err)
	}

	// 10. Double Pledge Defense
	err = contract.CreatePledge(
		ctx,
		"PLG-001",
		"AST-LAND-001",
		"lender_bank_a",
		"owner1",
		500000,
	)
	if err != nil {
		t.Fatalf("CreatePledge failed: %v", err)
	}

	// Attempt second active pledge against same asset
	err = contract.CreatePledge(
		ctx,
		"PLG-002",
		"AST-LAND-001",
		"lender_bank_b",
		"owner1",
		300000,
	)
	if err == nil {
		t.Fatalf("expected double pledge to be rejected, but it succeeded")
	}

	// 11. Simulate Transfer While Pledged (Must Be Blocked)
	sim, err := contract.SimulateTransfer(
		ctx,
		"TKN-LAND-001",
		"owner1",
		"investor2",
		5000,
	)
	if err != nil {
		t.Fatalf("SimulateTransfer failed: %v", err)
	}
	if sim.Allowed {
		t.Fatalf("expected transfer simulation to be blocked due to active pledge, but it was allowed")
	}

	// 12. Release Pledge
	err = contract.ReleasePledge(ctx, "PLG-001")
	if err != nil {
		t.Fatalf("ReleasePledge failed: %v", err)
	}

	// 13. Simulate Transfer After Pledge Release (Should Be Allowed)
	sim, err = contract.SimulateTransfer(
		ctx,
		"TKN-LAND-001",
		"owner1",
		"investor2",
		5000,
	)
	if err != nil {
		t.Fatalf("SimulateTransfer failed: %v", err)
	}
	if !sim.Allowed {
		t.Fatalf("expected transfer simulation to be allowed after pledge release, got reasons: %v", sim.ReasonCodes)
	}

	// 14. Execute Transfer
	err = contract.ExecuteTransfer(
		ctx,
		"TKN-LAND-001",
		"owner1",
		"investor2",
		5000,
	)
	if err != nil {
		t.Fatalf("ExecuteTransfer failed: %v", err)
	}

	// Verify updated holdings
	tokenBytes, _ := stub.GetState("token~TKN-LAND-001")
	var token Token
	_ = json.Unmarshal(tokenBytes, &token)
	if token.Holdings["owner1"] != 95000 || token.Holdings["investor2"] != 5000 {
		t.Fatalf("holding balance mismatch: owner1=%d, investor2=%d", token.Holdings["owner1"], token.Holdings["investor2"])
	}

	// 15. Verify Asset Passport
	passport, err := contract.GetAssetPassport(ctx, "AST-LAND-001")
	if err != nil {
		t.Fatalf("GetAssetPassport failed: %v", err)
	}
	if passport.PassportID != "PSP-AST-LAND-001" || passport.PublicProofHash == "" {
		t.Fatalf("invalid passport returned: %+v", passport)
	}
}

func TestFingerprintNormalization(t *testing.T) {
	fpLand, err := NormalizeFingerprint(TypeLand, " us-ca 123-456 ")
	if err != nil || fpLand != "LAND:US-CA_123-456" {
		t.Fatalf("LAND normalization mismatch: %s", fpLand)
	}

	fpVeh, err := NormalizeFingerprint(TypeVehicle, " 1hg-cr2f8-3ha-000000 ")
	if err != nil || fpVeh != "VIN:1HGCR2F83HA000000" {
		t.Fatalf("VEHICLE normalization mismatch: %s", fpVeh)
	}

	fpGrain, err := NormalizeFingerprint(TypeGrain, " silo-4 wheat-2026 ")
	if err != nil || fpGrain != "GRAIN:SILO-4_WHEAT-2026" {
		t.Fatalf("GRAIN normalization mismatch: %s", fpGrain)
	}
}

func TestStaleValuationTransferRejection(t *testing.T) {
	contract := new(SmartContract)
	stub := NewMockStub()
	ctx := &MockContext{stub: stub}

	_ = contract.InitLedger(ctx)
	_ = contract.RegisterAsset(ctx, "AST-VEH-001", TypeVehicle, "v1.0", "Fleet Truck", "owner1", "cust1", 80000, "USD", "1HGCR2F83HA123456", `{"vin":"1HGCR2F83HA123456","make":"Volvo","model":"VNL"}`)
	_ = contract.SubmitApproval(ctx, "APP-01", "AST-VEH-001", "REGISTRATION", RoleComplianceOfficer, "officer1", "APPROVED", "Approved")

	// Set expired valuation
	now := time.Now().Unix()
	val := ValuationRecord{
		AssetID:            "AST-VEH-001",
		Source:             "KELLEY_BLUE_BOOK",
		Amount:             75000,
		Currency:           "USD",
		EffectiveTimestamp: now - 100000,
		ExpiryTimestamp:    now - 10, // Expired!
		IsStale:            true,
	}
	asset, _ := contract.GetAsset(ctx, "AST-VEH-001")
	asset.ActiveValuation = &val
	assetBytes, _ := json.Marshal(asset)
	_ = ctx.GetStub().PutState("AST-VEH-001", assetBytes)

	// Token issuance should fail because valuation is stale
	err := contract.IssueTokens(ctx, "TKN-VEH-001", "AST-VEH-001", "TRK1", 1000)
	if err == nil {
		t.Fatalf("expected token issuance to fail due to stale valuation")
	}
}
