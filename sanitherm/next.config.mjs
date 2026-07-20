/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Attesten (foto/pdf) worden via een server action geüpload.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
