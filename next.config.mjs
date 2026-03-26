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
        source: '/hadith/:id',
        destination: '/details_hadith.html?id=:id'
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
      }
    ];
  }
};

export default nextConfig;
