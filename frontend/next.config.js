/** @type {import('next').NextConfig} */
const nextConfig = {
  // "standalone" output is for Docker/self-hosted only — not compatible with Vercel.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
