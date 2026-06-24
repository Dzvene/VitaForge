/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Type errors still fail the build; ESLint is run separately via `npm run lint`
  // to avoid eslint-9 flat-config friction during `next build`.
  eslint: { ignoreDuringBuilds: true },
  // Backend API base. Override via NEXT_PUBLIC_API_BASE in .env.local.
  env: {
    NEXT_PUBLIC_API_BASE:
      process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api/v1",
  },
};

export default nextConfig;
