import { notFound } from 'next/navigation';
import Link from 'next/link';

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const url = `https://firestore.googleapis.com/v1/projects/alfatawa-96fdd/databases/(default)/documents/alfatawa/${id}`;
  
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return { title: 'فتوى غير موجودة' };
    const json = await res.json();
    
    if (json.fields) {
      const q = json.fields.question?.stringValue || 'سؤال بدون عنوان';
      const a = json.fields.answer?.stringValue || '';
      const safeTitle = q.replace(/(<([^>]+)>)/gi, "").substring(0, 60) + ' | موسوعة البيان';
      const safeDesc = a.replace(/(<([^>]+)>)/gi, "").substring(0, 160);
      
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
    return { title: 'موسوعة الفتاوى' };
  }
}

export default async function FatwaPage({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const url = `https://firestore.googleapis.com/v1/projects/alfatawa-96fdd/databases/(default)/documents/alfatawa/${id}`;
  
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) notFound();
  
  const json = await res.json();
  if (!json.fields) notFound();

  const question = json.fields.question?.stringValue || 'سؤال بدون عنوان';
  const answer = json.fields.answer?.stringValue || '';
  
  // Format text (similar to renderRichText)
  const formatText = (text, isAnswer = true) => {
    // Remove placeholder domain (if any)
    let clean = text.replace(/https:\/\/your-site.com/g, '');

    // Replace related fatwa links
    clean = clean.replace(/href="([^\"]*fatwa_pages\/fatwa_(\d+)\.html)"/gi, (match, p1, p2) => {
      return `href="/fatwa/${p2}"`;
    });

    if (!isAnswer) return clean;

    const noTags = clean.replace(/(<([^>]+)>)/gi, "");
    if (clean !== noTags) {
      return clean; // If already has html tags, just return it
    }

    const processed = clean
      .replace(/\\r\\n/g, '\\n')
      .replace(/\\n{2,}/g, '|||')
      .replace(/\\n/g, ' ')
      .replace(/([.،])\\s*/g, '$1|||')
      .split('|||')
      .map(p => p.trim())
      .filter(Boolean);
      
    return processed.map(p => `<p>${p}</p>`).join('');
  };

  const formattedQuestion = formatText(question, false);
  const formattedAnswer = formatText(answer, true);

  return (
    <div className="reader-body">
      <nav className="main-nav">
        <div className="nav-container">
          <Link href="/" className="nav-logo">
            <span className="brand-mark"><span className="brand-slate">موسوعة</span> <span className="brand-accent">البيان</span></span>
          </Link>
        </div>
      </nav>

      <section className="reader-toolbar">
        <div className="container-fluid">
          <Link href="/?tab=fatawa" className="reader-return inline-flex items-center gap-2">
            <span>&rarr; العودة إلى نتائج الفتاوى</span>
          </Link>
        </div>
      </section>

      <div id="viewContainer" className="reader-container">
        <header className="article-header">
          <h1 className="article-title" dangerouslySetInnerHTML={{ __html: formattedQuestion }} />
          <div className="meta-bar">
            {id && <span className="reader-meta-pill">فتوى رقم {id}</span>}
          </div>
        </header>

        <article className="article-text" style={{ fontSize: '24px', lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: formattedAnswer }} />
      </div>
    </div>
  );
}
