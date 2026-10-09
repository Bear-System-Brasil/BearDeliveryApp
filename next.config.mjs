import { withSentryConfig } from '@sentry/nextjs/config';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.casaeculinaria.com',
      },
      {
        protocol: 'https',
        hostname: 'sportlife.com.br',
      },
      {
        protocol: 'https',
        hostname: 'like-delivery.s3.us-east-2.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'pub-e75b88e293b14bb3978db5a6fe91a9bd.r2.dev',
      }
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/',
        permanent: false,
      }
    ]
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Segredo: so existe no build da Vercel. Sem ele o build passa, so nao
  // sobe source map (a stack no painel fica minificada).
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Sobe mais arquivos do bundle do cliente: stack legivel tambem em chunk
  // de dependencia.
  widenClientFileUpload: true,
  // Source map vai pro Sentry e sai do deploy: o codigo-fonte nao fica
  // publico no site.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  // Eventos passam por /monitoring no proprio dominio, senao bloqueador de
  // anuncio derruba a requisicao pro sentry.io e o erro some.
  tunnelRoute: '/monitoring',
});