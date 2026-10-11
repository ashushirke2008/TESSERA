@echo off
echo ========================================================
echo  TESSERA - System Health & Readiness Check
echo ========================================================
echo.

echo Checking API Health (GET /api/health)...
curl -s http://localhost:3000/api/health
echo.
echo.

echo Checking API Readiness (GET /api/ready)...
curl -s http://localhost:3000/api/ready
echo.
echo.

echo Checking Dashboard Stats (GET /api/dashboard/stats)...
curl -s http://localhost:3000/api/dashboard/stats
echo.
echo.

echo Checking System Diagnostics (GET /api/health/system)...
curl -s http://localhost:3000/api/health/system
echo.
echo.
