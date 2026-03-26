import { notFound } from 'next/navigation';
import Link from 'next/link';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

export const revalidate = 3600; // Cache page for 1 hour

const firebaseConfig = {
  apiKey: "AIzaSyBYJ2pVoWJ5ednWOnnF2dOJ43MJvDi_8rw",
  projectId: "hadeth-7baf7",
};

// Initialize Firebase once
const app = getApps().length > 0 ? getApp('hadithApp') : initializeApp(firebaseConfig, 'hadithApp');
const db = getFirestore(app);

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

  // Formatting paragraphs
  const formatParagraphs = (str) => {
    if (!str) return '';
    const clean = str.replace(/(<([^>]+)>)/gi, "");
    if (str !== clean) return str; // return as is if it has html tags

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
    <div className="reader-body" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="main-nav" style={{ padding: '20px 0', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
        <div className="nav-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'space-between' }}>
          <Link href="/" className="nav-logo" style={{ textDecoration: 'none', fontWeight: 'bold', fontSize: '1.25rem', color: '#1a202c' }}>
            <span className="brand-mark"><span className="brand-slate" style={{ color: '#4a5568' }}>موسوعة</span> <span className="brand-accent" style={{ color: '#00538b' }}>البيان</span></span>
          </Link>
          <div style={{ display: 'flex', gap: '20px' }}>
            <Link href="/" style={{ color: '#4a5568', textDecoration: 'none' }}>الرئيسية</Link>
            <Link href="/?tab=hadith" style={{ color: '#00538b', textDecoration: 'none', fontWeight: 'bold' }}>حديث</Link>
            <Link href="/?tab=fatawa" style={{ color: '#4a5568', textDecoration: 'none' }}>الفتاوى</Link>
          </div>
        </div>
      </nav>

      <section className="reader-toolbar" style={{ padding: '15px 0', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e2e8f0' }}>
        <div className="nav-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          <Link href="/?tab=hadith" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#00538b', textDecoration: 'none', fontWeight: 'bold' }}>
            <span>&rarr; العودة لنتائج الأحاديث</span>
          </Link>
        </div>
      </section>

      <div className="reader-container" style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px', flex: '1' }}>
        <header style={{ marginBottom: '30px' }}>
          <div style={{ fontSize: '28px', lineHeight: '1.6', fontWeight: 'bold', color: '#1a202c', marginBottom: '20px' }} dangerouslySetInnerHTML={{ __html: formattedText }} />
        </header>

        <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
          {source && <div style={{ marginBottom: '8px' }}><strong style={{ color: '#4a5568' }}>المصدر:</strong> <span style={{ color: '#92400e' }}>{source}</span></div>}
          {hukm && <div style={{ marginBottom: '8px' }}><strong style={{ color: '#4a5568' }}>الحكم:</strong> <span style={{ color: hukm.includes('صحيح') ? '#15803d' : '#b91c1c' }}>{hukm}</span></div>}
          {rawi && <div style={{ marginBottom: '8px' }}><strong style={{ color: '#4a5568' }}>الراوي:</strong> <span style={{ color: '#92400e' }}>{rawi}</span></div>}
          {muhaddith && <div style={{ marginBottom: '8px' }}><strong style={{ color: '#4a5568' }}>المحدث:</strong> <span style={{ color: '#92400e' }}>{muhaddith}</span></div>}
          {page_or_number && <div style={{ marginBottom: '8px' }}><strong style={{ color: '#4a5568' }}>رقم/صفحة:</strong> <span style={{ color: '#64748b', fontFamily: 'monospace' }}>{page_or_number}</span></div>}
          {takhrij && <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
            <h4 style={{ fontWeight: 'bold', color: '#64748b', marginBottom: '8px', fontSize: '0.875rem' }}>التخريج:</h4>
            <p style={{ color: '#475569', fontSize: '0.875rem', lineHeight: '1.6' }}>{takhrij}</p>
          </div>}
        </div>

        {sharh && (
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1a202c', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #00538b' }}>الشرح</h3>
            <div style={{ fontSize: '1.4rem', lineHeight: '1.8', color: '#4a5568' }} dangerouslySetInnerHTML={{ __html: formattedSharh }} />
          </div>
        )}

        {osoul && (
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1a202c', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #00538b' }}>الأصول</h3>
            <div style={{ fontSize: '1.4rem', lineHeight: '1.8', color: '#4a5568' }} dangerouslySetInnerHTML={{ __html: formattedOsoul }} />
          </div>
        )}
      </div>
    </div>
  );
}
