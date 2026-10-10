@echo off
echo ========================================================
echo  TESSERA - Full Automated Test Suite Execution
echo ========================================================
echo.

echo 1. Testing Go Chaincode (blockchain/chaincode/asset-contract)...
cd /d "%~dp0..\blockchain\chaincode\asset-contract"
go test -v ./...
if %errorlevel% neq 0 (
    echo [FAIL] Chaincode unit tests failed.
    exit /b 1
)
echo [PASS] Chaincode tests succeeded.
echo.

echo 2. Testing Backend REST API (backend)...
cd /d "%~dp0..\backend"
cmd /c "npm test"
if %errorlevel% neq 0 (
    echo [FAIL] Backend tests failed.
    exit /b 1
)
echo [PASS] Backend tests succeeded.
echo.

echo 3. Building Frontend (frontend)...
cd /d "%~dp0..\frontend"
cmd /c "npm run build"
if %errorlevel% neq 0 (
    echo [FAIL] Frontend build failed.
    exit /b 1
)
echo [PASS] Frontend build succeeded.
echo.

echo ========================================================
echo  All Available Test Suites Passed Successfully
echo ========================================================
