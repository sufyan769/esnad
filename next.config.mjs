/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/index.html',
        destination: '/',
        permanent: true
      },
      // Legacy URL redirects → new Next.js dynamic routes
      {
        source: '/fatwa_pages/fatwa_:id.html',
        destination: '/fatwa/:id',
        permanent: true
      },
      {
        source: '/history.html',
        has: [{ type: 'query', key: 'id', value: '(?<id>.*)' }],
        destination: '/history/:id',
        permanent: true
      },
      {
        source: '/details_hadith.html',
        has: [{ type: 'query', key: 'id', value: '(?<id>.*)' }],
        destination: '/hadith/:id',
        permanent: true
      },
      {
        source: '/details_scholars.html',
        has: [{ type: 'query', key: 'id', value: '(?<id>.*)' }],
        destination: '/scholar/:id',
        permanent: true
      },
      {
        source: '/details_jarh.html',
        has: [{ type: 'query', key: 'id', value: '(?<id>.*)' }],
        destination: '/jarh/:id',
        permanent: true
      }
    ];
  }
};

export default nextConfig;
