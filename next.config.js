/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['res.cloudinary.com'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  },
  // Disable telemetry
  telemetry: false,
  // Disable font optimization 
  optimizeFonts: false,
};

module.exports = nextConfig;
