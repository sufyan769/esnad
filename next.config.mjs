/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/index.html'
      },
      {
        source: '/fatwa',
        destination: '/fatwa.html'
      },
      {
        source: '/scholar/:id',
        destination: '/details_scholars.html?id=:id'
      },
      {
        source: '/history',
        destination: '/history.html'
      },
      {
        source: '/history/:id',
        destination: '/history.html?id=:id'
      },
      {
        source: '/jarh/:id',
        destination: '/details_jarh.html?id=:id'
      }
    ];
  },
  async redirects() {
    return [
      {
        source: '/fatwa_pages/fatwa_:id.html',
        destination: '/fatwa/:id',
        permanent: true
      },
      {
        source: '/details_hadith.html',
        has: [
          {
            type: 'query',
            key: 'id',
            value: '(?<id>.*)'
          }
        ],
        destination: '/hadith/:id',
        permanent: true
      }
    ];
  }
};

export default nextConfig;
