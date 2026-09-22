/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from external sources in future
  images: {
    remotePatterns: [],
  },
  // Proxy API calls to Django in development
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8001/api/:path*",
      },
    ];
  },
};

export default nextConfig;
