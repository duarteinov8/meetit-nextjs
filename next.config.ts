import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static optimization where possible
  reactStrictMode: true,
  
  // Configure images if you're using them
  images: {
    domains: ['lh3.googleusercontent.com'], // For Google profile images
  },
  
  // Configure headers for security
  async headers() {
    return [
      {
        source: '/:path*',
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
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
