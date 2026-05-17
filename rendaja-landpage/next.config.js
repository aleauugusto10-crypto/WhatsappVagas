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

      {
        source: "/p/compretudo-shop-itabaiana-se",
        destination: "/?ref=qr_antigo",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;