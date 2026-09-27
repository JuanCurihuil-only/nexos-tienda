@echo off
chcp 65001 >nul
title Tienda Nexos
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [ERROR] Node.js no esta instalado.
  echo  Bajalo de https://nodejs.org ^(version LTS^), instalalo y volve a abrir este archivo.
  echo.
  pause
  exit /b
)

echo Node.js encontrado:
node --version
echo.

if not exist "node_modules" (
  echo Instalando dependencias, puede tardar unos minutos...
  call npm install
  if errorlevel 1 (
    echo.
    echo  [ERROR] Fallo npm install. Copia el texto de arriba y pasaselo a Claude.
    pause
    exit /b
  )
)

if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo Se creo el archivo .env: completalo con tus claves de Mercado Pago y datos de transferencia.
)

call node scripts\generar-sitemap.mjs

echo.
echo Levantando la tienda. Cuando aparezca "Local: http://localhost:...", abri esa direccion en el navegador.
echo NO cierres esta ventana mientras uses la tienda.
echo.
call npm run dev
pause
