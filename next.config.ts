import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backend = (
      process.env.BACKEND_API_ORIGIN ?? "http://localhost:8080"
    ).replace(/\/+$/, "");
    return [
      {
        source: "/backend-api/auth/login",
        destination: `${backend}/api/auth/login`,
      },
      {
        source: "/backend-api/management/admin/users",
        destination: `${backend}/api/management/admin/users`,
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
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
