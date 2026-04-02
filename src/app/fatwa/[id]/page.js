import { notFound } from 'next/navigation';
import Link from 'next/link';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import algoliasearch from "algoliasearch";
import { SearchIcon, BookOpen, ScrollText } from 'lucide-react';
import BackButton from '@/components/BackButton';

export const revalidate = 3600; // Cache page for 1 hour

// Initialize Firebase
const config = {
  apiKey: "AIzaSyC9kI6aUcgHokt7e20TOL1IQpA9M7r15pc",
  projectId: "alfatawa-96fdd",
};
const app = getApps().find(a => a.name === 'fatawaApp') ? getApp('fatawaApp') : initializeApp(config, 'fatawaApp');
const db = getFirestore(app);

// Initialize Algolia Clients
const fatawaAlgoliaClient = algoliasearch('3XD12I7386', '89e8e132a05fdb02275f64dec8d14d05');
const fatawaIndex = fatawaAlgoliaClient.initIndex('alfatawa');

const hadithAlgoliaClient = algoliasearch('88G4AVERCC', '76402a5d814264e01fb86ca687d26e30');
const hadithIndex = hadithAlgoliaClient.initIndex('firebase-hadeth');

async function fetchFatwa(id) {
  try {
    const snap = await getDoc(doc(db, 'alfatawa', id));
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
  const data = await fetchFatwa(id);
  
  if (data) {
    const q = data.question || 'تفاصيل الفتوى';
    const safeTitle = q.replace(/(<([^>]+)>)/gi, "").substring(0, 60) + ' | الفتاوى الذكية';
    const safeDesc = (data.answer || '').replace(/(<([^>]+)>)/gi, "").substring(0, 160);
    
    return {
      title: safeTitle,
      description: safeDesc,
    };
  }
  return { title: 'موسوعة الفتاوى' };
}

// Simple Arabic Stopwords for Keyword Extraction
const STOP_WORDS = new Set([
  'في', 'من', 'على', 'إلى', 'عن', 'بين', 'قال', 'قالت', 'يقول', 'أن', 'إن', 'كان', 'كانت',
  'الله', 'رسول', 'صلى', 'عليه', 'وسلم', 'رضي', 'عنه', 'عنها', 'ابن', 'أبي', 'عبد',
  'الذي', 'التي', 'اللذين', 'هو', 'هي', 'هم', 'ما', 'لا', 'لم', 'لن', 'أو', 'أم', 'كيف',
  'هل', 'متى', 'لماذا', 'أين', 'حكم', 'فضيلة', 'الشيخ', 'الرجاء', 'الإفادة', 'وجزاكم', 'خيراً', 'أريد', 'السلام', 'عليكم', 'ورحمة', 'وبركاته'
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

export default async function FatwaPage({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const data = await fetchFatwa(id);
  
  if (!data) notFound();

  let questionText = data.question || 'سؤال غير متاح';
  if (questionText.includes('https://your-site.com')) {
    questionText = questionText.replace('https://your-site.com', '').trim();
  }
  
  const question = questionText;
  const answer = data.answer || 'إجابة غير متاحة';
  const category = data.category || 'عام';
  const mufti = data.mufti || '';

  const formatText = (str) => {
    if (!str) return '';
    const clean = str.replace(/(<([^>]+)>)/gi, "");
    
    let processedStr = str;
    if (str !== clean) {
       processedStr = str
        .replace(/style="[^"]*"/gi, "")
        .replace(/dir="[^"]*"/gi, "")
        .replace(/width="[^"]*"/gi, "")
        .replace(/margin[^=]*="[^"]*"/gi, "");
    }

    return processedStr
      .replace(/\\r\\n/g, '<br/>')
      .replace(/\\n/g, '<br/>');
  };

  const formattedQuestion = formatText(question);
  const formattedAnswer = formatText(answer);

  // Topics & Algolia Queries
  const fullContent = `${question} ${answer}`;
  const topics = extractTopics(fullContent);
  const semanticQuery = topics.join(" ");
  
  let similarFatawa = [];
  let relatedHadiths = [];
  
  if (semanticQuery) {
    try {
      const [fatawaRes, hadithRes] = await Promise.all([
        fatawaIndex.search(semanticQuery, { hitsPerPage: 4, similarQuery: semanticQuery }),
        hadithIndex.search(semanticQuery, { hitsPerPage: 3 })
      ]);
      similarFatawa = fatawaRes.hits.filter(h => h.objectID !== id); // Exclude current fatwa
      relatedHadiths = hadithRes.hits;
    } catch (e) {
      console.error("Algolia semantic search error:", e);
    }
  }

  return (
    <div className="reader-body">
      <nav className="main-nav hidden md:block">
        <div className="nav-container">
          <Link href="/" className="nav-logo">
            <span className="brand-mark">
              <span className="brand-slate">موسوعة</span> <span className="brand-accent">البيان</span>
            </span>
          </Link>
          <div className="nav-links">
            <Link href="/" className="nav-link">الرئيسية</Link>
            <Link href="/?tab=hadith" className="nav-link">الحديث الشريف</Link>
            <Link href="/?tab=scholars" className="nav-link">تراجم العلماء</Link>
            <Link href="/?tab=history" className="nav-link">سير الأعلام</Link>
            <Link href="/?tab=jarh" className="nav-link">الجرح والتعديل</Link>
            <Link href="/?tab=fatawa" className="nav-link active">الفتاوى</Link>
          </div>
        </div>
      </nav>

      <section className="reader-toolbar">
        <div className="nav-container">
          <BackButton title="العودة لنتائج الفتاوى" fallbackHref="/?tab=fatawa" />
        </div>
      </section>

      {/* reader container with generous left AND right padding explicitly assigned */}
      <div className="reader-container" style={{ maxWidth: '1100px', width: '92%', padding: '60px 8%', marginTop: '40px', marginBottom: '80px', overflowX: 'hidden' }}>
        
        <header className="article-header" style={{ marginBottom: '50px', textAlign: 'right' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {category.split(',').map(cat => (
              <span key={cat} style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 12px', borderRadius: '16px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                {cat.trim()}
              </span>
            ))}
          </div>

          <h1 style={{ fontFamily: "'Amiri', serif", fontSize: '1.5rem', lineHeight: '1.8', color: '#011e1f', marginBottom: '30px' }} 
              dangerouslySetInnerHTML={{ __html: formattedQuestion }} />
          
          <div className="reader-meta-pill" style={{ display: 'inline-flex', padding: '8px 16px', background: '#fdfaf3', border: '1px solid #f4e6c5', gap: '8px', color: '#92400e' }}>
            <span>رقم الفتوى: {id}</span>
            {mufti && <span>| المفتي: {mufti}</span>}
          </div>
        </header>

        {/* Smart Topics / الدلالات الموضوعية */}
        {topics.length > 0 && (
          <div style={{ marginBottom: '40px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 'bold', color: '#64748b', fontSize: '1.1rem' }}>دلالات الفتوى:</span>
            {topics.map(topic => (
              <Link key={topic} href={`/?tab=all&q=${encodeURIComponent(topic)}`} 
                    style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '6px 16px', borderRadius: '16px', fontSize: '1rem', textDecoration: 'none', fontWeight: 'bold', transition: 'background 0.2s' }}>
                # {topic}
              </Link>
            ))}
          </div>
        )}

        <div style={{ marginBottom: '60px' }}>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#027d8d', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #027d8d', paddingBottom: '12px' }}>
            <BookOpen size={28} /> الإجابة
          </h3>
          <div style={{ fontFamily: "'Noto Naskh Arabic', sans-serif", fontSize: '1.25rem', lineHeight: '2.1', color: '#1a202c', textAlign: 'right' }} dangerouslySetInnerHTML={{ __html: formattedAnswer }} />
        </div>

        {/* Semantic Features Section: Similar Fatawa & Related Hadith */}
        {(similarFatawa.length > 0 || relatedHadiths.length > 0) && (
          <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: '40px', marginTop: '40px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: "'Amiri', serif", marginBottom: '30px', color: '#0f172a', textAlign: 'center' }}>
              مواد معرفية ذات صلة
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
              
              {/* Similar Fatawa */}
              {similarFatawa.length > 0 && (
                <div style={{ background: '#fcfaf5', padding: '24px', borderRadius: '16px', border: '1px solid #f0e6d2' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '20px' }}>
                    <SearchIcon size={20} /> فتاوى مشابهة
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {similarFatawa.map(hit => (
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
                </div>
              )}
              
              {/* Related Hadiths */}
              {relatedHadiths.length > 0 && (
                <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#027d8d', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '20px' }}>
                    <ScrollText size={20} /> أحاديث نبوية مرتبطة
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {relatedHadiths.map(hit => (
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
              
            </div>
          </div>
        )}

      </div>
      
      <footer className="site-footer bg-slate-800 text-slate-300 py-6 text-center mt-auto" style={{ backgroundColor: '#1e293b', color: '#94a3b8', padding: '24px 0', textAlign: 'center' }}>
        <p style={{ margin: 0 }}>&copy; 2025 موسوعة البيان. جميع الحقوق محفوظة. (الإصدار 1.3.2)</p>
      </footer>
    </div>
  );
}
