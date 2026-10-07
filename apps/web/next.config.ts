import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // App interamente dinamica (sessione utente): niente prerender con cacheComponents.
  transpilePackages: ['@rdl/core'],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
