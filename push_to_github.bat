@echo off
chcp 65001 > nul
echo ===================================================
echo   Syncing project to GitHub (xeem2541/insurance-crm)
echo ===================================================
echo.
echo [1/3] Adding changes...
git add .
echo [2/3] Committing changes...
set "msg=%~1"
if "%msg%"=="" (
    set /p "msg=Enter commit message (Press Enter for default): "
)
if "%msg%"=="" (
    set "msg=Update system changes"
)
git commit -m "%msg%"
echo.
echo [3/3] Pushing to GitHub (main branch)...
git push origin main
echo.
echo ===================================================
echo   Done! Vercel will automatically deploy updates.
echo ===================================================
pause
