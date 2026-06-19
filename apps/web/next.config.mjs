/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpila los paquetes internos del monorepo (TS sin build previo).
  transpilePackages: ['@eventflow/core', '@eventflow/ui'],
};

export default nextConfig;
