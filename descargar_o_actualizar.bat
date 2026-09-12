@echo off
cd /d "%~dp0"
chcp 65001 >nul
title IMAV Motors - Descargar / Actualizar desde Docker Hub

echo =======================================================
echo     DESCARGAR O ACTUALIZAR IMÁGENES - IMAV MOTORS
echo =======================================================
echo.

echo [1/3] Verificando Docker Desktop...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker Desktop no está iniciado. Iniciándolo...
    if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
        start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    )
    :wait_docker
    ping -n 4 127.0.0.1 >nul
    docker info >nul 2>&1
    if %errorlevel% neq 0 goto wait_docker
)
echo [OK] Docker activo.
echo.

set "COMPOSE_FILE=docker-compose.prod.yml"
if not exist "%COMPOSE_FILE%" (
    if exist "docker-compose.yml" (
        set "COMPOSE_FILE=docker-compose.yml"
    ) else (
        echo [ERROR] No se encontró docker-compose.prod.yml ni docker-compose.yml.
        pause
        exit /b 1
    )
)

echo [2/3] Descargando imágenes desde Docker Hub...
echo (Se mostrará el progreso de descarga de cada contenedor)
echo.
docker compose -f %COMPOSE_FILE% pull
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Hubo un problema al descargar las imágenes.
    echo Verifica tu conexión a internet o si el repositorio es privado (ejecutar 'docker login').
    pause
    exit /b 1
)

echo.
echo [3/3] ¡Descarga completada correctamente!
echo.
echo =======================================================
echo  El sistema está listo para ser ejecutado con:
echo  iniciar_imav.bat
echo =======================================================
echo.
pause
exit /b 0
