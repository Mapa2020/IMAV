@echo off
cd /d "%~dp0"
chcp 65001 >nul
title IMAV Motors - Iniciando Sistema

echo =======================================================
echo          INICIANDO SISTEMA IMAV MOTORS S.R.L.
echo =======================================================
echo.

:: 1. Verificar si Docker Desktop está en ejecución
echo [1/4] Verificando Docker Desktop...
docker info >nul 2>&1
if %errorlevel% equ 0 goto docker_ready

echo Docker no está corriendo. Iniciando Docker Desktop...
if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
) else (
    echo [ADVERTENCIA] No se encontró la ruta estándar de Docker Desktop.
)

echo Esperando a que el motor de Docker responda...
:wait_docker
ping -n 4 127.0.0.1 >nul
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ... conectando con Docker ...
    goto wait_docker
)

:docker_ready
echo [OK] Docker Desktop está activo.
echo.

:: 2. Iniciar Contenedores (Prioriza desarrollo si existe docker-compose.yml)
echo [2/4] Iniciando contenedores de Base de Datos, Backend y Frontend...
if exist "docker-compose.yml" (
    docker compose up -d
) else if exist "docker-compose.prod.yml" (
    docker compose -f docker-compose.prod.yml up -d
) else (
    echo [ERROR] No se encontró docker-compose.yml ni docker-compose.prod.yml.
    pause
    exit /b 1
)

if %errorlevel% neq 0 (
    echo [ERROR] No se pudieron iniciar los contenedores.
    pause
    exit /b 1
)

echo [OK] Contenedores en ejecución.
echo.

:: 3. Esperar a que el Frontend responda
echo [3/4] Esperando a que el frontend responda en http://localhost:5173...
set /a attempts=0

:wait_frontend
curl.exe -s -o nul http://localhost:5173
if %errorlevel% equ 0 goto frontend_ready

set /a attempts+=1
if %attempts% geq 25 goto frontend_timeout

echo ... esperando frontend [intento %attempts%/25] ...
ping -n 2 127.0.0.1 >nul
goto wait_frontend

:frontend_timeout
echo [ADVERTENCIA] El frontend tardó más de lo esperado en responder. Intentando abrir navegador...
goto open_browser

:frontend_ready
echo [OK] Servidor Frontend activo y respondiendo.

:open_browser
:: 4. Abrir en el navegador predeterminado
echo [4/4] Abriendo IMAV Motors en el navegador...
start "" "http://localhost:5173"

echo.
echo =======================================================
echo     ¡SISTEMA IMAV MOTORS INICIADO CORRECTAMENTE!
echo     URL de acceso: http://localhost:5173
echo =======================================================
ping -n 4 127.0.0.1 >nul
exit /b 0
