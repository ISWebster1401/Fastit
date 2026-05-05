#!/usr/bin/env bash
set -e

echo "==> Instalando dependencias del frontend..."
cd front
npm install

echo "==> Compilando frontend (React + Vite)..."
npm run build

echo "==> Copiando dist/ → back/static/..."
cd ..
rm -rf back/static
cp -r front/dist back/static

echo "==> Build completado ✓"
