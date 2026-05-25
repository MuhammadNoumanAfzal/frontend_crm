import path from "node:path";
import type { NextConfig } from "next";

const appRoot = __dirname;

const nextConfig: NextConfig = {
  turbopack: {
    root: appRoot,
  },
  outputFileTracingRoot: path.resolve(appRoot),
};

export default nextConfig;
