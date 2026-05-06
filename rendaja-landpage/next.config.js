/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,

  async redirects() {
    return [
      {
        source: "/",
        has: [
          {
            type: "host",
            value: "shop.rendaja.online",
          },
        ],
        destination: "/shopping",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;