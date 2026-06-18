import { notFound } from 'next/navigation';
import Link from 'next/link';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, query, where, limit, getDocs } from "firebase/firestore";
import { BookOpen, ScrollText } from 'lucide-react';
import BackButton from '@/components/BackButton';
import SimilarFatawa from '@/components/SimilarFatawa';

export const revalidate = 3600; // Cache page for 1 hour

// Initialize Firebase
const config = {
  apiKey: "AIzaSyC9kI6aUcgHokt7e20TOL1IQpA9M7r15pc",
  projectId: "alfatawa-96fdd",
};
const app = getApps().find(a => a.name === 'fatawaApp') ? getApp('fatawaApp') : initializeApp(config, 'fatawaApp');
const db = getFirestore(app);

// Algolia has been removed from Server-Side to save the monthly indexing quota.
// See: src/components/SimilarFatawa.js for the Client-Side version


async function fetchFatwa(id) {
  try {
    // 1. Try Document ID
    const snap = await getDoc(doc(db, 'alfatawa', id));
    if (snap.exists()) return snap.data();

    // 2. Fallback: Query by field ID
    const { collection, query, where, limit, getDocs } = await import("firebase/firestore");
    const q = query(collection(db, 'alfatawa'), where("id", "==", id), limit(1));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      const data = querySnap.docs[0].data();
      if (!data.objectID) data.objectID = querySnap.docs[0].id;
      return data;
    }

    // 3. Fallback: Numeric ID
    if (!isNaN(id)) {
      const qNum = query(collection(db, 'alfatawa'), where("id", "==", Number(id)), limit(1));
      const querySnapNum = await getDocs(qNum);
      if (!querySnapNum.empty) {
        const data = querySnapNum.docs[0].data();
        if (!data.objectID) data.objectID = querySnapNum.docs[0].id;
        return data;
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
  // Fix broken smart links in question and answer
  const fixLinks = (str) => {
    if (!str) return '';
    return str.replace(/https:\/\/your-site\.com\/fatwa_pages\/fatwa_(\d+)\.html/g, '/fatwa/$1')
              .replace(/https:\/\/your-site\.com/g, '');
  };

  questionText = fixLinks(questionText).trim();
  
  const question = questionText;
  const answer = data.answer || 'إجابة غير متاحة';
  const category = data.category || 'عام';
  const mufti = data.mufti || '';

  const formatText = (str) => {
    if (!str) return '';
    
    // First, fix the smart links
    let processedStr = fixLinks(str);
    
    const clean = processedStr.replace(/(<([^>]+)>)/gi, "");
    
    if (processedStr !== clean) {
       processedStr = processedStr
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
  
  let similarFatawa = []; // Handled client-side via <SimilarFatawa> to avoid Googlebot quota drain
  let relatedHadiths = [];


  return (
    <div className="reader-body">

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

        {/* Similar Fatawa - Client-Side only to avoid Googlebot Algolia quota drain */}
        {topics.length > 0 && (
          <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: '40px', marginTop: '40px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: "'Amiri', serif", marginBottom: '30px', color: '#0f172a', textAlign: 'center' }}>
              فتاوى ذات صلة
            </h2>
            <SimilarFatawa topics={topics} currentId={id} />
          </div>
        )}

      </div>
      
      <footer className="site-footer bg-slate-800 text-slate-300 py-6 text-center mt-auto" style={{ backgroundColor: '#1e293b', color: '#94a3b8', padding: '24px 0', textAlign: 'center' }}>
        <p style={{ margin: 0 }}>&copy; 2025 موسوعة البيان. جميع الحقوق محفوظة. (الإصدار 1.3.4)</p>
      </footer>
    </div>
  );
}
