'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import algoliasearch from 'algoliasearch/lite';
import { SearchIcon } from 'lucide-react';

// Client-side only: Googlebot never executes this
const hadithClient = algoliasearch('88G4AVERCC', '76402a5d814264e01fb86ca687d26e30');
const hadithIndex = hadithClient.initIndex('firebase-hadeth');

export default function SimilarHadiths({ categories, currentId }) {
  const [similarHadiths, setSimilarHadiths] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!categories || categories.length === 0) return;
    const query = categories.slice(0, 2).join(' ');
    
    hadithIndex.search(query, { hitsPerPage: 5 })
      .then(res => {
        const filtered = (res.hits || []).filter(h => h.objectID !== currentId).slice(0, 4);
        setSimilarHadiths(filtered);
      })
      .catch(e => console.warn('SimilarHadiths Algolia error:', e.message))
      .finally(() => setLoaded(true));
  }, [categories, currentId]);

  if (!loaded || similarHadiths.length === 0) return null;

  return (
    <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#027d8d', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '20px' }}>
        <SearchIcon size={20} /> أحاديث مشابهة
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {similarHadiths.map(hit => (
          <Link key={hit.objectID} href={`/hadith/${hit.objectID}`}
            style={{ textDecoration: 'none', display: 'block', background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', transition: 'border-color 0.2s' }}>
            <p style={{ color: '#334155', fontSize: '1.05rem', lineHeight: '1.6', margin: '0 0 8px 0', fontFamily: "'Amiri', serif" }}>
              {hit.text ? hit.text.substring(0, 100) + '...' : 'نص الحديث'}
            </p>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', gap: '8px' }}>
              <span>الراوي: {Array.isArray(hit.rawi) ? hit.rawi[0] : hit.rawi}</span> •
              <span style={{ color: hit.hukm && (Array.isArray(hit.hukm) ? hit.hukm[0] : hit.hukm)?.includes('صحيح') ? '#16a34a' : 'inherit' }}>
                {Array.isArray(hit.hukm) ? hit.hukm[0] : hit.hukm}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
