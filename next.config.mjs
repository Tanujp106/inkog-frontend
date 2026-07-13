/** @type {import('next').NextConfig} */
import path from "node:path";

const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["interface-kit"],
  turbopack: {
    resolveAlias: {
      react: path.resolve(process.cwd(), "app/interface-kit-react-shim.ts"),
    },
  },
};

export default nextConfig;
