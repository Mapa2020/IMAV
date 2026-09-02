@echo off
setlocal

echo =======================================================
echo    INSTALADOR DE AUTO-ARRANQUE - IMAV MOTORS S.R.L.
echo =======================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "TARGET_VBS=%SCRIPT_DIR%auto_start_imav.vbs"
set "SHORTCUT_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\IMAV_Motors_AutoStart.lnk"

echo Registrando acceso directo en la carpeta de Inicio de Windows...
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%TARGET_VBS%\"'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.Description = 'Inicio Automatico IMAV Motors'; $s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo.
    echo =======================================================
    echo  [EXITO] Inicio automatico configurado con exito.
    echo.
    echo  Cada vez que la PC se reinicie o inicie sesion:
    echo  - Docker Desktop se verificara e iniciara.
    echo  - Los contenedores se levantaran en segundo plano.
    echo  - Se abrira automaticamente IMAV en el navegador.
    echo =======================================================
) else (
    echo.
    echo [ERROR] No se pudo crear el acceso directo.
)

echo.
pause
