/** @type {import('next').NextConfig} */

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
})

// Dynamically create remote patterns for Supabase images
const remotePatterns = [
  // Allow Unsplash images for demo/mock data
  {
    protocol: 'https',
    hostname: 'images.unsplash.com',
    port: '',
    pathname: '/**',
  },
];

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const supabaseHostname = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
    remotePatterns.push({
      protocol: 'https',
      hostname: supabaseHostname,
      port: '',
      pathname: '/storage/v1/object/public/**',
    });
  } catch (error) {
    console.warn('Could not parse NEXT_PUBLIC_SUPABASE_URL for image remotePatterns. Please ensure it is a valid URL.');
  }
}

const nextConfig = {
  // Image optimization
  images: {
    remotePatterns,
  },

  // Webpack configuration for chunk loading stability
  webpack: (config, { dev, isServer }) => {
    // Add fallbacks for Node.js modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        child_process: false,
        net: false,
        dns: false,
        fs: false,
        worker_threads: false,
        tls: false,
        crypto: false,
        stream: false,
        util: false,
        url: false,
        querystring: false,
        path: false,
        os: false,
      };
    }

    if (dev && !isServer) {
      // Improve chunk loading reliability in development
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            default: {
              minChunks: 1,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: -10,
              reuseExistingChunk: true,
            },
          },
        },
      };

      // Add chunk loading timeout configuration
      config.output = {
        ...config.output,
        chunkLoadTimeout: 30000, // 30 seconds timeout
      };
    }

    return config;
  },

  // Development server configuration
  ...(process.env.NODE_ENV === 'development' && {
    experimental: {
      // Disable webpack cache in development to prevent chunk issues  
      webpackBuildWorker: false,
    },
    // Add development-specific optimizations
    onDemandEntries: {
      maxInactiveAge: 60 * 1000, // 1 minute
      pagesBufferLength: 5,
    },
  }),

  async rewrites() {
    return [
      {
        source: '/marketing/admin/dashboard',
        destination: '/admin/dashboard',
      },
    ]
  },
}

module.exports = withPWA(nextConfig)
