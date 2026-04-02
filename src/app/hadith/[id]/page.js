import { notFound } from 'next/navigation';
import Link from 'next/link';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import algoliasearch from "algoliasearch";
import { SearchIcon, BookOpen, ScrollText } from 'lucide-react';
import BackButton from '@/components/BackButton';

export const revalidate = 3600; // Cache page for 1 hour

const firebaseConfig = {
  apiKey: "AIzaSyBYJ2pVoWJ5ednWOnnF2dOJ43MJvDi_8rw",
  projectId: "hadeth-7baf7",
};

// Initialize Firebase once
const app = getApps().find(a => a.name === 'hadithApp') ? getApp('hadithApp') : initializeApp(firebaseConfig, 'hadithApp');
const db = getFirestore(app);

// Initialize Algolia Clients
const hadithAlgoliaClient = algoliasearch('88G4AVERCC', '76402a5d814264e01fb86ca687d26e30');
const hadithIndex = hadithAlgoliaClient.initIndex('firebase-hadeth');

const fatawaAlgoliaClient = algoliasearch('3XD12I7386', '89e8e132a05fdb02275f64dec8d14d05');
const fatawaIndex = fatawaAlgoliaClient.initIndex('alfatawa');

async function fetchHadith(id) {
  try {
    const snap = await getDoc(doc(db, 'hadiths', id));
    if (snap.exists()) return snap.data();
    return null;
  } catch (error) {
    console.error("Firebase fetch error:", error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const data = await fetchHadith(id);
  
  if (data) {
    const text = data.text || 'نص الحديث غير متوفر';
    const safeTitle = text.replace(/(<([^>]+)>)/gi, "").substring(0, 60) + ' | موسوعة الحديث';
    const safeDesc = text.replace(/(<([^>]+)>)/gi, "").substring(0, 160);
    
    return {
      title: safeTitle,
      description: safeDesc,
      openGraph: {
        title: safeTitle,
        description: safeDesc,
        type: 'article',
      },
    };
  }
  
  return { title: 'موسوعة الحديث' };
}

// Simple Arabic Stopwords for Keyword Extraction
const STOP_WORDS = new Set([
  'في', 'من', 'على', 'إلى', 'عن', 'بين', 'قال', 'قالت', 'يقول', 'أن', 'إن', 'كان', 'كانت',
  'الله', 'رسول', 'صلى', 'عليه', 'وسلم', 'رضي', 'عنه', 'عنها', 'ابن', 'أبي', 'عبد',
  'الذي', 'التي', 'اللذين', 'هو', 'هي', 'هم', 'ما', 'لا', 'لم', 'لن', 'أو', 'أم'
]);

// Extract unique meaningful topics from text
function extractTopics(text) {
  const clean = text.replace(/(<([^>]+)>)/gi, " ").replace(/[^\u0600-\u06FF\s]/g, '');
  const words = clean.split(/\s+/);
  const freq = {};
  
  words.forEach(w => {
    if (w.length >= 5 && !STOP_WORDS.has(w)) {
      freq[w] = (freq[w] || 0) + 1;
    }
  });

  // Sort by frequency, then length
  return Object.keys(freq)
    .sort((a, b) => freq[b] - freq[a] || b.length - a.length)
    .slice(0, 5); // Return top 5 keywords
}

export default async function HadithPage({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const data = await fetchHadith(id);
  
  if (!data) notFound();

  // Extract fields
  const text = data.text || 'نص الحديث غير متوفر';
  const sharh = data.sharh || '';
  const osoul = data.osoul || '';
  const takhrij = data.takhrij || '';
  
  // Topics & Algolia Queries
  const topics = extractTopics(text);
  const semanticQuery = topics.join(" ");
  
  let similarHadiths = [];
  let relatedFatawa = [];
  
  if (semanticQuery) {
    try {
      const [hadithRes, fatawaRes] = await Promise.all([
        hadithIndex.search(semanticQuery, { hitsPerPage: 4, similarQuery: semanticQuery }),
        fatawaIndex.search(semanticQuery, { hitsPerPage: 3 })
      ]);
      similarHadiths = hadithRes.hits.filter(h => h.objectID !== id); // Exclude current hadith
      relatedFatawa = fatawaRes.hits;
    } catch (e) {
      console.error("Algolia semantic search error:", e);
    }
  }

  // Extract arrays or strings for metadata
  const getFieldVal = (field) => {
    if (!field) return '';
    if (Array.isArray(field)) return field.join('، ');
    return String(field);
  };
  
  const source = getFieldVal(data.source);
  const hukm = getFieldVal(data.hukm);
  const rawi = getFieldVal(data.rawi);
  const muhaddith = getFieldVal(data.muhaddith);
  const page_or_number = getFieldVal(data.page_or_number);

  // Formatting paragraphs and cleaning dirty HTML
  const formatParagraphs = (str) => {
    if (!str) return '';
    const clean = str.replace(/(<([^>]+)>)/gi, "");
    
    // If it has HTML tags from DB, just remove inline styles that break layout
    if (str !== clean) {
      return str
        .replace(/style="[^"]*"/gi, "")
        .replace(/dir="[^"]*"/gi, "")
        .replace(/width="[^"]*"/gi, "")
        .replace(/margin[^=]*="[^"]*"/gi, "");
    }

    const processed = str
      .replace(/\\r\\n/g, '\n')
      .split(/(?<=[.])\s+|\n+/)
      .map(p => p.trim())
      .filter(Boolean);
      
    return processed.map(p => `<p>${p}</p>`).join('');
  };

  const formattedText = formatParagraphs(text);
  const formattedSharh = formatParagraphs(sharh);
  const formattedOsoul = formatParagraphs(osoul);

  return (
    <div className="reader-body">

      <section className="reader-toolbar">
        <div className="nav-container">
          <BackButton title="العودة لنتائج الأحاديث" fallbackHref="/?tab=hadith" />
        </div>
      </section>

      {/* Using max-width 1100px to utilize empty space, adding generous 80px padding and cleaning inline overrides */}
      <div className="reader-container" style={{ maxWidth: '1100px', width: '92%', padding: '60px 8%', paddingRight: '10%', marginTop: '40px', marginBottom: '80px', overflowX: 'hidden' }}>
        
        {/* Hadith Core Text */}
        <header className="article-header" style={{ textAlign: 'center', marginBottom: '60px', paddingRight: '20px', paddingLeft: '20px', borderBottom: '1px solid #f0f0f0', paddingBottom: '30px' }}>
          <h1 style={{ fontFamily: "'Amiri', serif", fontSize: '1.5rem', lineHeight: '1.8', color: '#011e1f', marginBottom: '10px', marginInline: '0', paddingInline: '0' }} 
              dangerouslySetInnerHTML={{ __html: formattedText }} />
        </header>

        {/* Smart Topics / الدلالات الموضوعية */}
        {topics.length > 0 && (
          <div style={{ marginBottom: '40px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 'bold', color: '#64748b', fontSize: '1.1rem' }}>الدلالات الموضوعية:</span>
            {topics.map(topic => (
              <Link key={topic} href={`/?tab=all&q=${encodeURIComponent(topic)}`} 
                    style={{ backgroundColor: '#e0f2fe', color: '#0284c7', padding: '6px 16px', borderRadius: '16px', fontSize: '1rem', textDecoration: 'none', fontWeight: 'bold', transition: 'background 0.2s' }}
                    className="hover:no-underline">
                # {topic}
              </Link>
            ))}
          </div>
        )}

        {/* Metadata Beige Box */}
        <div style={{ backgroundColor: '#fcfaf5', padding: '40px', borderRadius: '16px', border: '1px solid #f0e6d2', marginBottom: '60px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {source && <div><strong style={{ color: '#8d6e63' }}>المصدر:</strong> <span style={{ color: '#011e1f', fontWeight: 'bold' }}>{source}</span></div>}
            {rawi && <div><strong style={{ color: '#8d6e63' }}>الراوي:</strong> <span style={{ color: '#011e1f', fontWeight: 'bold' }}>{rawi}</span></div>}
            {muhaddith && <div><strong style={{ color: '#8d6e63' }}>المحدث:</strong> <span style={{ color: '#011e1f', fontWeight: 'bold' }}>{muhaddith}</span></div>}
            {page_or_number && <div><strong style={{ color: '#8d6e63' }}>رقم/صفحة:</strong> <span style={{ color: '#011e1f', fontFamily: 'monospace' }}>{page_or_number}</span></div>}
            {hukm && <div>
              <strong style={{ color: '#8d6e63' }}>الحكم:</strong> 
              <span style={{ 
                color: hukm.includes('صحيح') || hukm.includes('حسن') ? '#15803d' : '#b91c1c', 
                fontWeight: 'bold', padding: '2px 8px', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '4px', marginLeft: '6px'
              }}>{hukm}</span>
            </div>}
          </div>
          
          {/* Takhrij section inside metadata */}
          {takhrij && <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f0e6d2' }}>
            <h4 style={{ fontWeight: 'bold', color: '#8d6e63', marginBottom: '8px', fontSize: '0.95rem' }}>بيانات التخريج:</h4>
            <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: '1.7' }}>{takhrij}</p>
          </div>}
        </div>

        {/* Sharh */}
        {sharh && (
          <div style={{ marginBottom: '40px', padding: '30px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#027d8d', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BookOpen size={24} /> الشرح والتوضيح
            </h3>
            <div style={{ fontFamily: "'Amiri', serif", fontSize: '1.3rem', lineHeight: '2.0', color: '#1a202c' }} dangerouslySetInnerHTML={{ __html: formattedSharh }} />
          </div>
        )}

        {/* Osoul */}
        {osoul && (
          <div style={{ marginBottom: '40px', padding: '30px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ea580c', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ScrollText size={24} /> الأصول والأحكام
            </h3>
            <div style={{ fontFamily: "'Amiri', serif", fontSize: '1.3rem', lineHeight: '2.0', color: '#1a202c' }} dangerouslySetInnerHTML={{ __html: formattedOsoul }} />
          </div>
        )}
        
        {/* Semantic Features Section: Similar Hadith & Related Fatawa */}
        {(similarHadiths.length > 0 || relatedFatawa.length > 0) && (
          <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: '40px', marginTop: '40px' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', fontFamily: "'Amiri', serif", marginBottom: '30px', color: '#0f172a', textAlign: 'center' }}>
              إضافات معرفية ذات صلة
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
              
              {/* Similar Hadiths */}
              {similarHadiths.length > 0 && (
                <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#027d8d', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '20px' }}>
                    <SearchIcon size={20} /> أحاديث مشابهة
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {similarHadiths.map(hit => (
                      <Link key={hit.objectID} href={`/hadith/${hit.objectID}`} 
                            className="block bg-white p-4 rounded-lg border border-slate-200 transition-all hover:border-[#027d8d] hover:shadow-md"
                            style={{ textDecoration: 'none' }}>
                        <p style={{ color: '#334155', fontSize: '1.05rem', lineHeight: '1.6', margin: '0 0 8px 0', fontFamily: "'Amiri', serif" }}>
                          {hit.text ? hit.text.substring(0, 100) + '...' : 'نص الحديث'}
                        </p>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', gap: '8px' }}>
                          <span>الراوي: {Array.isArray(hit.rawi) ? hit.rawi[0] : hit.rawi}</span> • 
                          <span style={{ color: hit.hukm && hit.hukm.includes('صحيح') ? '#16a34a' : 'inherit' }}>{Array.isArray(hit.hukm) ? hit.hukm[0] : hit.hukm}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Related Fatawa */}
              {relatedFatawa.length > 0 && (
                <div style={{ background: '#fdfaf3', padding: '24px', borderRadius: '16px', border: '1px solid #f4e6c5' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '20px' }}>
                    <BookOpen size={20} /> فتاوى فقهية متعلقة
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {relatedFatawa.map(hit => (
                      <Link key={hit.objectID} href={`/fatwa/${hit.objectID}`} 
                            className="block bg-white p-4 rounded-lg border border-[#f4e6c5] transition-all hover:border-[#92400e] hover:shadow-md"
                            style={{ textDecoration: 'none' }}>
                        <p style={{ color: '#0f172a', fontSize: '1.05rem', fontWeight: 'bold', lineHeight: '1.5', margin: '0 0 8px 0' }}>
                          {hit.question ? hit.question.replace('https://your-site.com', '').substring(0, 90) + '...' : 'سؤال الفتوى'}
                        </p>
                        <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {hit.answer_snippet || hit.answer || 'الجواب...'}
                        </p>
                      </Link>
                    ))}
                  </div>
                  <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <Link href={`/?tab=fatawa&q=${encodeURIComponent(semanticQuery)}`} style={{ color: '#92400e', fontSize: '0.9rem', fontWeight: 'bold', textDecoration: 'none' }}>
                      عرض المزيد من الفتاوى &rarr;
                    </Link>
                  </div>
                </div>
              )}
              
            </div>
          </div>
        )}

      </div>
      
      <footer className="site-footer bg-slate-800 text-slate-300 py-6 text-center mt-auto" style={{ backgroundColor: '#1e293b', color: '#94a3b8', padding: '24px 0', textAlign: 'center' }}>
        <p style={{ margin: 0 }}>&copy; 2025 موسوعة البيان. جميع الحقوق محفوظة. (الإصدار 1.3.4)</p>
      </footer>
    </div>
  );
}
