@echo off
title Deploy GuardianPulse to Vercel
cd /d "c:\college project"
echo ======================================================================
echo Deploying GuardianPulse to Vercel
echo ======================================================================
echo.
echo Running Vercel deployment...
echo (If prompted to log in, your browser will open to authenticate)
echo.
npx vercel --prod
echo.
pause

