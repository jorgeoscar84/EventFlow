import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Carga el .env de la raíz del monorepo (Next solo mira el dir de la app por defecto).
const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, '../../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpila los paquetes internos del monorepo (TS sin build previo).
  transpilePackages: ['@eventflow/core', '@eventflow/ui', '@eventflow/db'],
};

export default nextConfig;
