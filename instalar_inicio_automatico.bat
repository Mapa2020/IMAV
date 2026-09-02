@echo off
chcp 65001 >nul
title IMAV Motors - Configurar Inicio Automático con Windows

echo =======================================================
echo    INSTALADOR DE AUTO-ARRANQUE - IMAV MOTORS S.R.L.
echo =======================================================
echo.
echo Este instalador configurará el sistema para que se inicie
echo automáticamente cada vez que Windows encienda o reinicie la PC.
echo.

set "SCRIPT_DIR=%~dp0"
set "TARGET_VBS=%SCRIPT_DIR%auto_start_imav.vbs"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\IMAV_Motors_AutoStart.lnk"

:: Crear acceso directo usando PowerShell
powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$s = $ws.CreateShortcut('%SHORTCUT_PATH%'); " ^
  "$s.TargetPath = 'wscript.exe'; " ^
  "$s.Arguments = '\"%TARGET_VBS%\"'; " ^
  "$s.WorkingDirectory = '%SCRIPT_DIR%'; " ^
  "$s.Description = 'Inicio Automático de IMAV Motors'; " ^
  "$s.Save()"

if %errorlevel% equ 0 (
    echo =======================================================
    echo  [EXITO] ¡Inicio automático instalado con éxito!
    echo.
    echo  Cada vez que la PC se reinicie o el usuario inicie sesión:
    echo  - Docker Desktop se verificará/iniciará.
    echo  - Todos los contenedores de IMAV se levantarán en segundo plano.
    echo  - Se abrirá automáticamente el sistema en el navegador.
    echo =======================================================
) else (
    echo [ERROR] No se pudo registrar el acceso directo en Inicio.
)

echo.
pause
exit /b 0
