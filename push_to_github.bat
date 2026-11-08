@echo off
title Push GuardianPulse to GitHub
cd /d "c:\college project"
echo ======================================================================
echo Pushing GuardianPulse to:
echo https://github.com/pavanreddy59/parental-control-app.git
echo ======================================================================
echo.
git push --force -u origin main
echo.
if %errorlevel% equ 0 (
    echo [SUCCESS] Successfully pushed all files to GitHub!
    echo Now open https://vercel.com/new and import this repository to deploy!
) else (
    echo [ERROR] Push failed. Please check your credentials or run:
    echo git push --force -u origin main
)
echo.
pause
