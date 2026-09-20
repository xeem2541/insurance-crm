@echo off
chcp 65001 > nul
echo ===================================================
echo   Syncing project to GitHub (xeem2541/insurance-crm)
echo ===================================================
echo.

echo [STEP 1/4] Checking for sensitive files...
git status --short | findstr /i ".env docker-compose.yml" > nul
if %errorlevel%==0 (
  echo.
  echo  WARNING: Found possibly sensitive files in changes:
  git status --short | findstr /i ".env docker-compose.yml"
  echo.
  echo  Please verify these files are safe to commit!
  echo.
)

echo [STEP 2/4] Preview of changes (git status):
echo ---------------------------------------------------
git status --short
echo ---------------------------------------------------
echo.
set /p "confirm=Proceed with git add . ? (y/N): "
if /i NOT "%confirm%"=="y" (
  echo Aborted. No changes were made.
  pause
  exit /b 1
)

echo [STEP 3/4] Adding changes...
git add .

echo [STEP 4/4] Committing changes...
set "msg=%~1"
if "%msg%"=="" (
    set /p "msg=Enter commit message (Press Enter for default): "
)
if "%msg%"=="" (
    set "msg=Update system changes"
)
git commit -m "%msg%"
echo.
echo Pushing to GitHub (main branch)...
git push origin main
echo.
echo ===================================================
echo   Done! Vercel will automatically deploy updates.
echo ===================================================
pause
