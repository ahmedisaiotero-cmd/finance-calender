import type { NextConfig } from "next";

import { nextSecurityHeaderConfig } from "./lib/security/http-headers";

const nextConfig: NextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  async headers() {
    return nextSecurityHeaderConfig();
  },
};

export default nextConfig;
