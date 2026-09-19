@echo off
cd /d "%~dp0"
chcp 65001 >nul
title IMAV Motors - Subir imágenes a Docker Hub

echo =======================================================
echo          PUBLICACIÓN EN DOCKER HUB - IMAV MOTORS
echo =======================================================
echo.
set /p DOCKER_USER="Introduce tu usuario de Docker Hub (o presiona Enter para usar mapadoc2025): "
if defined DOCKER_USER set "DOCKER_USER=%DOCKER_USER: =%"
if "%DOCKER_USER%"=="" set "DOCKER_USER=mapadoc2025"
set "DOCKER_USERNAME=%DOCKER_USER%"

echo.
echo Usando usuario: %DOCKER_USER%
echo.

:: 1. Comprobar estado de Docker Desktop
echo [1/5] Verificando Docker Desktop y estado del motor...
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

:: 2. Iniciar sesión en Docker
echo [2/5] Comprobando sesión de Docker Hub...
set "DO_LOGIN=n"
set /p DO_LOGIN="¿Deseas iniciar sesión o cambiar de usuario en Docker Hub? (s/N): "
if /i "%DO_LOGIN%"=="s" (
    docker login -u %DOCKER_USER%
    if %errorlevel% neq 0 (
        echo [ERROR] No se pudo autenticar en Docker Hub.
        pause
        exit /b 1
    )
) else (
    echo Usando la sesión actual activa de Docker Desktop.
)

:: 3. Construir imágenes locales
echo.
echo [3/5] Construyendo imágenes locales desde cero (sin caché)...
docker compose -f docker-compose.yml build --no-cache
if %errorlevel% neq 0 (
    echo [ERROR] Falló la construcción de imágenes.
    pause
    exit /b 1
)

:: 4. Etiquetar imágenes con el nombre de usuario
echo.
echo [4/5] Preparando etiquetas para Docker Hub...
docker tag mapadoc2025/imav-backend:latest %DOCKER_USER%/imav-backend:latest >nul 2>&1
docker tag imav-backend:latest %DOCKER_USER%/imav-backend:latest >nul 2>&1
docker tag mapadoc2025/imav-frontend:latest %DOCKER_USER%/imav-frontend:latest >nul 2>&1
docker tag imav-frontend:latest %DOCKER_USER%/imav-frontend:latest >nul 2>&1
echo [OK] Imágenes listas:
echo   - %DOCKER_USER%/imav-backend:latest
echo   - %DOCKER_USER%/imav-frontend:latest

:: 5. Subir imágenes a Docker Hub
echo.
echo [5/5] Subiendo imágenes a Docker Hub (esto puede tardar unos minutos)...
docker push %DOCKER_USER%/imav-backend:latest
if %errorlevel% neq 0 (
    echo [ERROR] Falló la subida del backend.
    pause
    exit /b 1
)

docker push %DOCKER_USER%/imav-frontend:latest
if %errorlevel% neq 0 (
    echo [ERROR] Falló la subida del frontend.
    pause
    exit /b 1
)

echo.
echo =======================================================
echo  ¡IMÁGENES PUBLICADAS CON ÉXITO EN DOCKER HUB!
echo =======================================================
echo.
echo Ya puedes descargar estas imágenes en cualquier PC con:
echo   docker pull %DOCKER_USER%/imav-backend:latest
echo   docker pull %DOCKER_USER%/imav-frontend:latest
echo.
pause
exit /b 0
