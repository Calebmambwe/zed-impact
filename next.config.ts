import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Legacy URL patterns — redirect to correct multi-tenant paths
      {
        source: "/donate/:orgSlug",
        destination: "/:orgSlug/donate",
        permanent: true,
      },
      {
        source: "/events/:orgSlug",
        destination: "/:orgSlug/events",
        permanent: true,
      },
      {
        source: "/store/:orgSlug",
        destination: "/:orgSlug/store",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
