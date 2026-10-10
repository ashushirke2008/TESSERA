@echo off
echo ========================================================
echo  TESSERA - System Prerequisites Check
echo ========================================================
echo.

echo Checking Node.js...
node -v
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not on PATH.
) else (
    echo [OK] Node.js is available.
)

echo.
echo Checking Go...
go version
if %errorlevel% neq 0 (
    echo [ERROR] Go is not installed or not on PATH.
) else (
    echo [OK] Go is available.
)

echo.
echo Checking Docker...
docker --version
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed or not on PATH.
) else (
    echo [OK] Docker CLI is available.
)

echo.
echo Checking Docker Daemon...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Docker daemon is not running. Please start Docker Desktop.
) else (
    echo [OK] Docker daemon is running.
)

echo.
echo Checking NPM...
cmd /c npm -v
if %errorlevel% neq 0 (
    echo [ERROR] NPM is not functional.
) else (
    echo [OK] NPM is functional.
)

echo.
echo ========================================================
echo  Prerequisites Check Completed
echo ========================================================
