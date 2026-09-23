import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';

/** Optional analytics origins, injected only when the owner enabled them via env. */
const analytics = [
  process.env.NEXT_PUBLIC_YM_ID ? 'https://mc.yandex.ru https://mc.yandex.com' : '',
  process.env.NEXT_PUBLIC_GA_ID ? 'https://www.googletagmanager.com https://www.google-analytics.com' : '',
]
  .filter(Boolean)
  .join(' ');

const csp = [
  "default-src 'self'",
  // Next.js ships an inline bootstrap script; nonce-based CSP is a next-iteration item.
  `script-src 'self' 'unsafe-inline' ${analytics}`.trim(),
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https: ${analytics}`.trim(),
  `font-src 'self' data:`,
  `connect-src 'self' ${analytics}`.trim(),
  `frame-src 'self' https://www.openstreetmap.org https://www.google.com`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }] : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['better-sqlite3'],
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/booking/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
};

export default nextConfig;
