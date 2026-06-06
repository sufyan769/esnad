'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import algoliasearch from 'algoliasearch/lite';
import { SearchIcon } from 'lucide-react';

// Client-side only: Googlebot never executes this
const fatawaClient = algoliasearch('3XD12I7386', '89e8e132a05fdb02275f64dec8d14d05');
const fatawaIndex = fatawaClient.initIndex('alfatawa');

const PLACEHOLDER_DOMAIN = 'https://your-site.com';

export default function SimilarFatawa({ topics, currentId }) {
  const [similarFatawa, setSimilarFatawa] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!topics || topics.length === 0) return;
    const query = topics.slice(0, 2).join(' ');

    fatawaIndex.search(query, { hitsPerPage: 5 })
      .then(res => {
        const filtered = (res.hits || []).filter(h => h.objectID !== currentId).slice(0, 4);
        setSimilarFatawa(filtered);
      })
      .catch(e => console.warn('SimilarFatawa Algolia error:', e.message))
      .finally(() => setLoaded(true));
  }, [topics, currentId]);

  if (!loaded || similarFatawa.length === 0) return null;

  return (
    <div style={{ background: '#fcfaf5', padding: '24px', borderRadius: '16px', border: '1px solid #f0e6d2' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '20px' }}>
        <SearchIcon size={20} /> فتاوى مشابهة
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {similarFatawa.map(hit => (
          <Link key={hit.objectID} href={`/fatwa/${hit.objectID}`}
            style={{ textDecoration: 'none', display: 'block', background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #f4e6c5', transition: 'border-color 0.2s' }}>
            <p style={{ color: '#0f172a', fontSize: '1.05rem', fontWeight: 'bold', lineHeight: '1.5', margin: '0 0 8px 0' }}>
              {hit.question ? hit.question.replace(PLACEHOLDER_DOMAIN, '').substring(0, 90) + '...' : 'سؤال الفتوى'}
            </p>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {hit.answer_snippet || hit.answer || 'الجواب...'}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
