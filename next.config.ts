import type { NextConfig } from "next";

type RemotePattern = { protocol: 'http' | 'https'; hostname: string };

function getRemotePatterns(): RemotePattern[] {
  const webdavUrl = process.env.WEBDAV_URL;
  if (webdavUrl) {
    try {
      const { hostname, protocol } = new URL(webdavUrl);
      const proto = protocol.replace(':', '') as 'http' | 'https';
      return [{ protocol: proto, hostname }];
    } catch {
      // fall through to default
    }
  }
  return [{ protocol: 'https', hostname: '**' }];
}

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Robots-Tag',            value: 'noindex, nofollow' },
          { key: 'X-Content-Type-Options',   value: 'nosniff' },
          { key: 'X-Frame-Options',          value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',       value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "img-src 'self' data: blob:",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
  output: "standalone",
  serverExternalPackages: ['sharp'],
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    remotePatterns: getRemotePatterns(),
    formats: ['image/webp', 'image/avif'],
  },
  experimental: {
    optimizeCss: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn', 'info'] }
      : false,
  },
};

export default nextConfig;
