import { notFound } from 'next/navigation';
import Link from 'next/link';

// Algolia Configuration (matches legacy history.html)
const APP_ID = '88G4AVERCC';
const API_KEY = '33b0b484f534b2ae2dac948d588345a6';
const INDEX_NAME = 'algolia_unified';

/**
 * Fetches an object from Algolia by its ID.
 */
async function fetchAlgoliaObject(id) {
  const url = `https://${APP_ID}-dsn.algolia.net/1/indexes/${INDEX_NAME}/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    headers: {
      'X-Algolia-Application-Id': APP_ID,
      'X-Algolia-API-Key': API_KEY,
    },
    next: { revalidate: 3600 }
  });
  
  if (!res.ok) return null;
  return res.json();
}

/**
 * Fetches all related chunks for a biography.
 * Logic: objectID is usually characterId_chunkNumber
 */
async function fetchAllChunks(initialHit) {
  if (!initialHit) return [];
  
  // Extract base ID
  let baseId = initialHit.character_id || initialHit.characterId || initialHit.id;
  if (!baseId && typeof initialHit.objectID === 'string') {
    baseId = initialHit.objectID.split('_')[0];
  }
  
  if (!baseId) return [initialHit];

  // Search for all hits with this base ID
  const searchUrl = `https://${APP_ID}-dsn.algolia.net/1/indexes/${INDEX_NAME}/query`;
  const searchRes = await fetch(searchUrl, {
    method: 'POST',
    headers: {
      'X-Algolia-Application-Id': APP_ID,
      'X-Algolia-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      params: `filters=id:${baseId} OR character_id:${baseId} OR characterId:${baseId}&hitsPerPage=100`
    }),
    next: { revalidate: 3600 }
  });

  if (!searchRes.ok) return [initialHit];
  const data = await searchRes.json();
  const hits = data.hits || [];
  
  if (hits.length === 0) return [initialHit];

  // Sort by chunk number
  return hits.sort((a, b) => {
    const chunkA = parseInt(a.chunk || (typeof a.objectID === 'string' ? a.objectID.split('_')[1] : 0));
    const chunkB = parseInt(b.chunk || (typeof b.objectID === 'string' ? b.objectID.split('_')[1] : 0));
    return chunkA - chunkB;
  });
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const hit = await fetchAlgoliaObject(id);
  
  if (!hit) return { title: 'سير الأعلام' };
  
  const title = hit.name || hit.book_title || 'سير الأعلام';
  const description = (hit.full_intro || hit.text || '').substring(0, 160);
  
  return {
    title: `${title} | سير الأعلام`,
    description,
  };
}

export default async function HistoryPage({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const initialHit = await fetchAlgoliaObject(id);
  
  if (!initialHit) notFound();

  const chunks = await fetchAllChunks(initialHit);
  const title = initialHit.name || initialHit.book_title || 'بدون عنوان';
  
  // Format content
  const fullContent = chunks.map(c => {
    const parts = [];
    if (c.full_intro) parts.push(c.full_intro);
    if (c.text_content) parts.push(c.text_content);
    else if (c.text) parts.push(c.text);
    return parts.join('\n\n');
  }).join('\n\n');

  const processedLines = fullContent
    .replace(/\|\|/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  return (
    <div className="reader-body" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#fffbf2' }}>

      <section className="reader-toolbar" style={{ borderBottom: '1px solid #e8e4d9' }}>
        <div className="nav-container">
          <Link href="/?tab=history" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#854d0e', textDecoration: 'none', fontWeight: 'bold' }}>
            <span>&rarr; العودة لنتائج البحث</span>
          </Link>
        </div>
      </section>

      <div className="reader-container" style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px', flex: '1' }}>
        <header style={{ marginBottom: '30px', borderBottom: '2px solid #e8e4d9', paddingBottom: '20px' }}>
          <h1 style={{ fontSize: '36px', lineHeight: '1.6', fontWeight: 'bold', color: '#451a03', marginBottom: '15px', fontFamily: '"Amiri", serif' }}>
            {title}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', color: '#78350f', fontSize: '14px' }}>
            {initialHit.book_title && <span style={{ backgroundColor: '#fef3c7', padding: '4px 12px', borderRadius: '16px' }}><strong>الكتاب:</strong> {initialHit.book_title}</span>}
            {initialHit.part_number && <span style={{ backgroundColor: '#fef3c7', padding: '4px 12px', borderRadius: '16px' }}><strong>الجزء:</strong> {initialHit.part_number}</span>}
            {initialHit.page_number && <span style={{ backgroundColor: '#fef3c7', padding: '4px 12px', borderRadius: '16px' }}><strong>الصفحة:</strong> {initialHit.page_number}</span>}
          </div>
        </header>

        <article style={{ fontSize: '24px', lineHeight: '1.8', color: '#451a03', fontFamily: '"Amiri", serif', textAlign: 'justify' }}>
          {processedLines.map((line, idx) => (
            <p key={idx} style={{ marginBottom: '1.5rem' }}>{line}</p>
          ))}
        </article>
      </div>

      <footer className="site-footer bg-slate-800 text-slate-300 py-6 text-center mt-auto" style={{ backgroundColor: '#1e293b', color: '#94a3b8', padding: '24px 0', textAlign: 'center' }}>
        <p style={{ margin: 0 }}>&copy; 2025 موسوعة البيان. جميع الحقوق محفوظة. (الإصدار 1.3.3)</p>
      </footer>
    </div>
  );
}
