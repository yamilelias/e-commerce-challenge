import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  async headers() {
    return [{ source: "/orders/:reference", headers: [
      { key: "Cache-Control", value: "no-store" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ] }];
  },
};

export default config;
