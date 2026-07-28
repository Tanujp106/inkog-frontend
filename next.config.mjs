/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["interface-kit"],
  turbopack: {
    resolveAlias: {
      react: "./app/interface-kit-react-shim.ts",
    },
  },
};

export default nextConfig;
