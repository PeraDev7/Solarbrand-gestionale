@echo off
echo ===================================
echo   SolarBrand - Avvio Applicazione
echo ===================================
echo.
echo Sincronizzazione sorgenti e database in corso...

set PROJ=H:\Il mio Drive\Siti in TRAE\SolarBrand - gestionale chiamate\app vera e propria
set DST=C:\npm_tmp2

if not exist "%DST%\data" mkdir "%DST%\data"
if not exist "%PROJ%\data" mkdir "%PROJ%\data"

xcopy /s /y /q "%PROJ%\src" "%DST%\src\"
copy /y "%PROJ%\server.ts" "%DST%\server.ts" >nul
copy /y "%PROJ%\vite.config.ts" "%DST%\vite.config.ts" >nul
copy /y "%PROJ%\tsconfig.json" "%DST%\tsconfig.json" >nul
copy /y "%PROJ%\index.html" "%DST%\index.html" >nul
copy /y "%PROJ%\.env" "%DST%\.env" >nul

REM Pulizia file di log SQLite residui per prevenire corruzioni
if exist "%DST%\data\app.db-wal" del /f /q "%DST%\data\app.db-wal" >nul 2>&1
if exist "%DST%\data\app.db-shm" del /f /q "%DST%\data\app.db-shm" >nul 2>&1

REM Copia il database principale
if exist "%PROJ%\data\app.db" copy /y "%PROJ%\data\app.db" "%DST%\data\app.db" >nul

echo Sorgenti e database sincronizzati con successo.
echo.
echo Apertura del browser in corso...
start http://localhost:3000

echo App disponibile su: http://localhost:3000
echo Premi Ctrl+C per fermare il server.
echo.

cd /d C:\npm_tmp2
npx tsx server.ts

REM Al termine, salva il DB aggiornato su Drive e pulisci i file temporanei WAL
copy /y "%DST%\data\app.db" "%PROJ%\data\app.db" >nul 2>&1
if exist "%DST%\data\app.db-wal" del /f /q "%DST%\data\app.db-wal" >nul 2>&1
if exist "%DST%\data\app.db-shm" del /f /q "%DST%\data\app.db-shm" >nul 2>&1

echo.
echo Il server e' stato arrestato.
pause
