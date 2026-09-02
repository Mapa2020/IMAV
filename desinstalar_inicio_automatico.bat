@echo off
chcp 65001 >nul
title IMAV Motors - Desactivar Inicio Automático

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\IMAV_Motors_AutoStart.lnk"

if exist "%SHORTCUT_PATH%" (
    del /f /q "%SHORTCUT_PATH%"
    echo [EXITO] Se ha eliminado el inicio automático de IMAV Motors.
) else (
    echo [INFO] No se encontró ninguna tarea de inicio automático registrada.
)

echo.
pause
exit /b 0
