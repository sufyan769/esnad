import { notFound } from 'next/navigation';
import Link from 'next/link';

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const url = `https://firestore.googleapis.com/v1/projects/islsm-9/databases/(default)/documents/scholars_biographies/${id}`;
  
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return { title: 'عالم غير موجود' };
    const json = await res.json();
    
    if (json.fields) {
      const name = json.fields.name?.stringValue || 'ترجمة العالم غير متوفرة';
      const safeTitle = `${name} | تراجم العلماء`;
      
      const trj = json.fields.trj?.stringValue || '';
      const safeDesc = trj.replace(/(<([^>]+)>)/gi, "").substring(0, 160);
      
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
  } catch(e) {
    return { title: 'موسوعة تراجم العلماء' };
  }
}

export default async function ScholarPage({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const url = `https://firestore.googleapis.com/v1/projects/islsm-9/databases/(default)/documents/scholars_biographies/${id}`;
  
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) notFound();
  
  const json = await res.json();
  if (!json.fields) notFound();

  // Extract fields
  const name = json.fields.name?.stringValue || 'بدون عنوان';
  const death = json.fields.death?.stringValue || '';
  const full = json.fields.full?.stringValue || '';
  const rank = json.fields.rank?.stringValue || '';
  const trj = json.fields.trj?.stringValue || '';

  // Formatting paragraphs
  const formatParagraphs = (str) => {
    if (!str) return '';
    const clean = str.replace(/(<([^>]+)>)/gi, "");
    if (str !== clean) return str;

    const processed = str
      .replace(/\\r\\n/g, '\n')
      .split(/(?<=[.])\s+|\n+/)
      .map(p => p.trim())
      .filter(Boolean);
      
    return processed.map(p => `<p>${p}</p>`).join('');
  };

  const formattedTrj = formatParagraphs(trj);

  return (
    <div className="reader-body" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      <section className="reader-toolbar">
        <div className="nav-container">
          <Link href="/?tab=scholars" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#00538b', textDecoration: 'none', fontWeight: 'bold' }}>
            <span>&rarr; العودة لنتائج البحث</span>
          </Link>
        </div>
      </section>

      <div className="reader-container" style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px', flex: '1' }}>
        <header style={{ marginBottom: '30px', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px' }}>
          <h1 style={{ fontSize: '32px', lineHeight: '1.6', fontWeight: 'bold', color: '#1a202c', marginBottom: '15px' }}>{name}</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', color: '#64748b', fontSize: '14px' }}>
            {death && <span style={{ backgroundColor: '#f1f5f9', padding: '4px 12px', borderRadius: '16px' }}><strong>تاريخ الوفاة:</strong> {death}</span>}
            {full && <span style={{ backgroundColor: '#f1f5f9', padding: '4px 12px', borderRadius: '16px' }}><strong>الاسم الكامل:</strong> {full}</span>}
            {rank && <span style={{ backgroundColor: '#f1f5f9', padding: '4px 12px', borderRadius: '16px' }}><strong>الترتيب:</strong> {rank}</span>}
            {id && <span style={{ backgroundColor: '#f1f5f9', padding: '4px 12px', borderRadius: '16px' }}><strong>المعرف:</strong> <span style={{ fontFamily: 'monospace' }}>{id}</span></span>}
          </div>
        </header>

        <article style={{ fontSize: '24px', lineHeight: '1.8', color: '#334155' }} dangerouslySetInnerHTML={{ __html: formattedTrj }} />
      </div>
      
      <footer className="site-footer bg-slate-800 text-slate-300 py-6 text-center mt-auto" style={{ backgroundColor: '#1e293b', color: '#94a3b8', padding: '24px 0', textAlign: 'center' }}>
        <p style={{ margin: 0 }}>&copy; 2025 موسوعة البيان. جميع الحقوق محفوظة. (الإصدار 1.3.3)</p>
      </footer>
    </div>
  );
}
