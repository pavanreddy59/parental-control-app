@echo off
title GuardianPulse - Automated Verification Test Suite
echo ======================================================================
echo Running GuardianPulse Automated Verification Suite (FR-01 to FR-10)
echo ======================================================================
node -e "require('./server.js'); const { runTests } = require('./tests/test_suite.js'); setTimeout(async () => { await runTests(); process.exit(0); }, 500);"
echo.
pause

