@echo off
chcp 65001 >nul
title IMAV Motors - Deteniendo Sistema

echo =======================================================
echo          DETENIENDO SISTEMA IMAV MOTORS S.R.L.
echo =======================================================
echo.

if exist "docker-compose.prod.yml" (
    docker compose -f docker-compose.prod.yml down
) else (
    docker compose down
)

echo.
echo =======================================================
echo       Sistema detenido de manera segura.
echo =======================================================
timeout /t 3 >nul
exit /b 0
