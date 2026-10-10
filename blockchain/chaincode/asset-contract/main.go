package main

import (
	"log"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

func main() {
	assetContract := new(SmartContract)

	cc, err := contractapi.NewChaincode(assetContract)
	if err != nil {
		log.Panicf("Error creating TESSERA asset-contract chaincode: %v", err)
	}

	if err := cc.Start(); err != nil {
		log.Panicf("Error starting TESSERA asset-contract chaincode: %v", err)
	}
}
