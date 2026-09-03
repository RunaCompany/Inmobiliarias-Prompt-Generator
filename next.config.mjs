/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['127.0.0.1', '192.168.1.89'],
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: /(?:[\\/]data[\\/]submissions\.json(?:\.[^\\/]+\.tmp)?$|[\\/]\.playwright-mcp[\\/])/,
      };
    }
    return config;
  },
};

export default nextConfig;
