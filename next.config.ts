import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  outputFileTracingIncludes: {
    '/retour-test/**': [
      './quality/recette-beta-admin.md',
      './quality/recette-beta-customer.md',
    ],
    '/api/test-feedback/**': [
      './quality/recette-beta-admin.md',
      './quality/recette-beta-customer.md',
    ],
  },
};

export default nextConfig;
