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
