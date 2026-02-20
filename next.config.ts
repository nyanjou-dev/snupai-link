import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: "/:slug.png",
        destination: "/qr/:slug",
      },
    ];
  },
};

export default nextConfig;
