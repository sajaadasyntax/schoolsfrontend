/** @type {import('next').NextConfig} */
const backendInternalUrl =
  process.env.BACKEND_INTERNAL_URL?.replace(/\/+$/, "") || "http://127.0.0.1:5000";

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "5000" },
      { protocol: "https", hostname: "imamshafie.online" },
      { protocol: "https", hostname: "www.imamshafie.online" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${backendInternalUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
