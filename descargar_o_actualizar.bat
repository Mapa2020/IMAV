@echo off
cd /d "%~dp0"
chcp 65001 >nul
title IMAV Motors - Actualizar Sistema desde Docker Hub

echo =======================================================
echo     ACTUALIZAR SISTEMA IMAV MOTORS S.R.L.
echo =======================================================
echo.

:: 1. Comprobar Docker Desktop
echo [1/4] Verificando Docker Desktop...
docker info >nul 2>&1
if %errorlevel% equ 0 goto docker_ready

echo Docker Desktop no está iniciado. Iniciándolo automáticamente...
if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
) else (
    echo [ADVERTENCIA] No se encontró Docker Desktop en la ruta estándar.
)

echo Esperando a que el motor de Docker responda...
:wait_docker
ping -n 4 127.0.0.1 >nul
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ... conectando con Docker Desktop ...
    goto wait_docker
)

:docker_ready
echo [OK] Docker Desktop activo y listo.
echo.

:: 2. Identificar archivo de composición
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

:: 3. Descargar últimas imágenes desde Docker Hub
echo [2/4] Descargando las imágenes más recientes desde Docker Hub...
echo Nota: Este proceso no modifica ni borra ningún dato de tu base de datos.
echo.
docker compose -f %COMPOSE_FILE% pull
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Hubo un problema al descargar las imágenes.
    echo Verifica tu conexión a internet o si el repositorio requiere autenticación previa con docker login
    pause
    exit /b 1
)

:: 4. Aplicar actualización a los contenedores
echo.
echo [3/4] Recreando contenedores con la nueva versión...
docker compose -f %COMPOSE_FILE% up -d --remove-orphans
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] No se pudieron aplicar las actualizaciones a los contenedores.
    pause
    exit /b 1
)

:: 5. Confirmación final
echo.
echo [4/4] ¡Actualización aplicada correctamente!
echo.
echo =======================================================
echo  ¡SISTEMA IMAV MOTORS ACTUALIZADO CON ÉXITO!
echo =======================================================
echo.
echo  - Las imágenes más recientes se han aplicado de inmediato.
echo  - Toda la información de clientes, vehículos, proformas,
echo    inventario e informes técnicos se mantiene 100%% INTACTA.
echo.
echo  El sistema se encuentra en ejecución en:
echo  http://localhost:5173
echo =======================================================
echo.
pause
exit /b 0
