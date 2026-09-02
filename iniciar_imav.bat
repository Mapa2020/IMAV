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
if %errorlevel% neq 0 (
    echo Docker no está corriendo. Iniciando Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    
    echo Esperando a que el motor de Docker responda...
    :wait_docker
    timeout /t 3 /nobreak >nul
    docker info >nul 2>&1
    if %errorlevel% neq 0 (
        echo ... conectando con Docker ...
        goto wait_docker
    )
)
echo [OK] Docker Desktop está activo.
echo.

:: 2. Iniciar Contenedores (Detecta si usa prod o local)
echo [2/4] Iniciando contenedores de Base de Datos, Backend y Frontend...
if exist "docker-compose.prod.yml" (
    docker compose -f docker-compose.prod.yml up -d
) else (
    docker compose up -d
)

if %errorlevel% neq 0 (
    echo [ERROR] No se pudieron iniciar los contenedores.
    pause
    exit /b 1
)

echo [OK] Contenedores en ejecución.
echo.

:: 3. Esperar a que el Frontend responda
echo [3/4] Esperando inicialización del sistema...
timeout /t 4 /nobreak >nul

:: 4. Abrir en el navegador predeterminado
echo [4/4] Abriendo IMAV Motors en el navegador...
start http://localhost:5173

echo.
echo =======================================================
echo     ¡SISTEMA IMAV MOTORS INICIADO CORRECTAMENTE!
echo     URL de acceso: http://localhost:5173
echo =======================================================
timeout /t 5 >nul
exit /b 0
