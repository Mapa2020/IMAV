@echo off
chcp 65001 >nul
title IMAV Motors - Subir imágenes a Docker Hub

echo =======================================================
echo          PUBLICACIÓN EN DOCKER HUB - IMAV MOTORS
echo =======================================================
echo.
set /p DOCKER_USER="Introduce tu usuario de Docker Hub (o presiona Enter para usar mapadoc2025): "
if "%DOCKER_USER%"=="" set "DOCKER_USER=mapadoc2025"

echo.
echo Usando usuario: %DOCKER_USER%
echo.

:: 1. Iniciar sesión en Docker
echo [1/4] Comprobando inicio de sesión en Docker Hub...
docker login
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo autenticar en Docker Hub.
    pause
    exit /b 1
)

:: 2. Construir imágenes locales
echo.
echo [2/4] Construyendo imágenes locales con docker compose build...
docker compose build
if %errorlevel% neq 0 (
    echo [ERROR] Falló la construcción de imágenes.
    pause
    exit /b 1
)

:: 3. Etiquetar imágenes con el nombre de usuario
echo.
echo [3/4] Preparando etiquetas para Docker Hub...
docker tag mapadoc2025/imav-backend:latest %DOCKER_USER%/imav-backend:latest >nul 2>&1
docker tag imav-backend:latest %DOCKER_USER%/imav-backend:latest >nul 2>&1
docker tag mapadoc2025/imav-frontend:latest %DOCKER_USER%/imav-frontend:latest >nul 2>&1
docker tag imav-frontend:latest %DOCKER_USER%/imav-frontend:latest >nul 2>&1
echo [OK] Imágenes listas:
echo   - %DOCKER_USER%/imav-backend:latest
echo   - %DOCKER_USER%/imav-frontend:latest

:: 4. Subir imágenes a Docker Hub
echo.
echo [4/4] Subiendo imágenes a Docker Hub (esto puede tardar unos minutos)...
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
