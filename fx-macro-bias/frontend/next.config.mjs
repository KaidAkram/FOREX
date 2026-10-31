/** @type {import('next').NextConfig} */

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://api.fontshare.com",
      "style-src 'self' 'unsafe-inline' https://api.fontshare.com https://fonts.googleapis.com",
      "font-src 'self' https://cdn.fontshare.com https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://hatscripts.github.io",
      "connect-src 'self' http://localhost:8001 http://127.0.0.1:8001 http://localhost:3000 http://localhost:3002 https://*.onrender.com https://api.imf.org https://stats.oecd.org https://api.worldbank.org",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const rawBackend =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8001";

let backendTarget = rawBackend.trim();
if (
  !backendTarget.startsWith("http://") &&
  !backendTarget.startsWith("https://") &&
  !backendTarget.startsWith("/")
) {
  if (backendTarget.includes(".onrender.com")) {
    backendTarget = `https://${backendTarget}`;
  } else {
    backendTarget = `http://${backendTarget}`;
  }
}
backendTarget = backendTarget.replace(/\/+$/, "");


const nextConfig = {
  output: process.env.STANDALONE === "true" ? "standalone" : undefined,
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    dangerouslyAllowSVG: false,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hatscripts.github.io",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  // Proxy API calls to Django backend
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
