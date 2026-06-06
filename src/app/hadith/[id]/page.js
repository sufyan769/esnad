import { notFound } from 'next/navigation';
import Link from 'next/link';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, query, where, limit, getDocs } from "firebase/firestore";
import { BookOpen, ScrollText } from 'lucide-react';
import BackButton from '@/components/BackButton';
import SimilarHadiths from '@/components/SimilarHadiths';

export const revalidate = 3600; // Cache page for 1 hour

const firebaseConfig = {
  apiKey: "AIzaSyBYJ2pVoWJ5ednWOnnF2dOJ43MJvDi_8rw",
  projectId: "hadeth-7baf7",
};

// Initialize Firebase once
const app = getApps().find(a => a.name === 'hadithApp') ? getApp('hadithApp') : initializeApp(firebaseConfig, 'hadithApp');
const db = getFirestore(app);

// Algolia has been removed from Server-Side to save the monthly indexing quota.
// See: src/components/SimilarHadiths.js for the Client-Side version


async function fetchHadith(id) {
  try {
    // 1. Try fetching directly by Document ID (Firebase ID)
    const snap = await getDoc(doc(db, 'hadiths', id));
    if (snap.exists()) return snap.data();

    // 2. Fallback: Search by "id" field (for sitemaps/legacy URLs that use numeric/string IDs)
    const q = query(collection(db, 'hadiths'), where("id", "==", id), limit(1));
    const querySnap = await getDocs(q);
    
    if (!querySnap.empty) {
      const data = querySnap.docs[0].data();
      // Ensure we have an objectID for downstream uses
      if (!data.objectID) data.objectID = querySnap.docs[0].id;
      return data;
    }

    // 3. Fallback: If "id" is numeric but passed as string, or vice versa
    if (!isNaN(id)) {
        const qNum = query(collection(db, 'hadiths'), where("id", "==", Number(id)), limit(1));
        const querySnapNum = await getDocs(qNum);
        if (!querySnapNum.empty) {
            const data = querySnapNum.docs[0].data();
            if (!data.objectID) data.objectID = querySnapNum.docs[0].id;
            return data;
        }
    }

    // 4. Fallback for Arabic slugs (e.g., "Sahih_Bukhari_1" --> 1)
    if (id.includes('_')) {
        const parts = id.split('_');
        const numericId = parts[parts.length - 1]; // Take the last part (usually the ID)
        if (numericId && !isNaN(numericId)) {
            const qSlug = query(collection(db, 'hadiths'), 
                        where("id", "in", [numericId, Number(numericId)]), 
                        limit(1));
            const querySnapSlug = await getDocs(qSlug);
            if (!querySnapSlug.empty) {
                const data = querySnapSlug.docs[0].data();
                if (!data.objectID) data.objectID = querySnapSlug.docs[0].id;
                return data;
            }
        }
    }

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
    const text = data.text || data.osoul || 'نص الحديث غير متوفر';
    const categories = Array.isArray(data.categories) ? data.categories.join(', ') : '';
    const safeTitle = text.replace(/(<([^>]+)>)/gi, "").substring(0, 60) + ' | موسوعة الحديث';
    const safeDesc = (categories ? `[${categories}] - ` : '') + text.replace(/(<([^>]+)>)/gi, "").substring(0, 160);
    
    return {
      title: safeTitle,
      description: safeDesc,
      keywords: categories,
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
  const categories = Array.isArray(data.categories) ? data.categories : [];
  
  // Topics & Algolia Queries
  const extractedTopics = extractTopics(text);
  const topics = categories.length > 0 ? categories : extractedTopics;
  const semanticQuery = (categories.length > 0 ? categories : extractedTopics).join(" ");
  
  let similarHadiths = []; // Handled client-side via <SimilarHadiths> to avoid Googlebot quota drain
  let relatedFatawa = [];


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
        
        {/* Similar Hadiths - Client-Side only to avoid Googlebot Algolia quota drain */}
        {categories.length > 0 && (
          <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: '40px', marginTop: '40px' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', fontFamily: "'Amiri', serif", marginBottom: '30px', color: '#0f172a', textAlign: 'center' }}>
              أحاديث ذات صلة
            </h2>
            <SimilarHadiths categories={categories} currentId={id} />
          </div>
        )}

      </div>
      
      <footer className="site-footer bg-slate-800 text-slate-300 py-6 text-center mt-auto" style={{ backgroundColor: '#1e293b', color: '#94a3b8', padding: '24px 0', textAlign: 'center' }}>
        <p style={{ margin: 0 }}>&copy; 2025 موسوعة البيان. جميع الحقوق محفوظة. (الإصدار 1.3.4)</p>
      </footer>
    </div>
  );
}
