@echo off
title GuardianPulse - Parental Control Application
echo ===================================================
echo Starting GuardianPulse Server & Demonstration Hub
echo ===================================================
echo Server starting at http://127.0.0.1:3000/
echo Opening default web browser in 2 seconds...

start http://127.0.0.1:3000/
node server.js
pause

