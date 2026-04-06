import { notFound } from 'next/navigation';
import Link from 'next/link';
import BackButton from '@/components/BackButton';

async function fetchJarh(id) {
  const docUrl = `https://firestore.googleapis.com/v1/projects/trajum-almaktaba/databases/(default)/documents/scholars/${id}`;
  
  try {
    const res = await fetch(docUrl, { next: { revalidate: 3600 } });
    if (res.ok) {
        return await res.json();
    } else {
        const searchUrl = `https://firestore.googleapis.com/v1/projects/trajum-almaktaba/databases/(default)/documents:runQuery`;
        const searchRes = await fetch(searchUrl, {
            method: 'POST',
            body: JSON.stringify({
                structuredQuery: {
                    from: [{ collectionId: 'scholars' }],
                    where: {
                        fieldFilter: {
                            field: { fieldPath: 'id' },
                            op: 'EQUAL',
                            value: { stringValue: id }
                        }
                    },
                    limit: 1
                }
            })
        });
        const searchJson = await searchRes.json();
        if (searchJson && searchJson[0]?.document) {
            return searchJson[0].document;
        } else if (!isNaN(id)) {
            const searchResNum = await fetch(searchUrl, {
                method: 'POST',
                body: JSON.stringify({
                    structuredQuery: {
                        from: [{ collectionId: 'scholars' }],
                        where: {
                            fieldFilter: {
                                field: { fieldPath: 'id' },
                                op: 'EQUAL',
                                value: { integerValue: Number(id) }
                            }
                        },
                        limit: 1
                    }
                })
            });
            const searchJsonNum = await searchResNum.json();
            if (searchJsonNum && searchJsonNum[0]?.document) {
                return searchJsonNum[0].document;
            }
        }
    }
  } catch(e) { console.error("fetchJarh error:", e); }
  return null;
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  try {
    const json = await fetchJarh(id);
    if (!json || !json.fields) return { title: 'راوي غير موجود' };
    
    if (json.fields) {
      const name = json.fields['الاسم']?.stringValue || 'راوي بدون اسم';
      const safeTitle = `${name} | الجرح والتعديل`;
      
      const rel = json.fields['علاقات الراوي']?.stringValue || '';
      const safeDesc = rel.replace(/(<([^>]+)>)/gi, "").substring(0, 160) || 'تفاصيل الراوي وأقوال الجرح والتعديل';
      
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
    return { title: 'موسوعة الجرح والتعديل' };
  }
}

export default async function JarhPage({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const json = await fetchJarh(id);

  if (!json || !json.fields) notFound();

  const getFieldVal = (field) => {
    if (!field) return '';
    if (field.stringValue) return field.stringValue;
    if (field.arrayValue && field.arrayValue.values) {
      return field.arrayValue.values.map(v => v.stringValue || '').join('، ');
    }
    return '';
  };

  const name = json.fields['الاسم']?.stringValue || 'راوي بدون اسم';
  const kunya = getFieldVal(json.fields['الكنية']);
  const nasab = getFieldVal(json.fields['النسب']);
  const residence = getFieldVal(json.fields['بلد الإقامة']);
  const death = getFieldVal(json.fields['تاريخ الوفاة']);
  const rankTabqa = getFieldVal(json.fields['طبقة رواة التقريب']);
  const rankHajar = getFieldVal(json.fields['الرتبة عند ابن حجر']);
  const rankDhahabi = getFieldVal(json.fields['الرتبة عند الذهبي']);
  const relations = getFieldVal(json.fields['علاقات الراوي']);
  
  // Extract Jarh list
  let jarhList = [];
  if (json.fields['الجرح والتعديل'] && json.fields['الجرح والتعديل'].arrayValue && json.fields['الجرح والتعديل'].arrayValue.values) {
    jarhList = json.fields['الجرح والتعديل'].arrayValue.values.map(v => v.stringValue || '');
  }

  // Find other dynamic fields
  const standardFields = ['id', 'الاسم', 'الكنية', 'النسب', 'بلد الإقامة', 'تاريخ الوفاة', 'طبقة رواة التقريب', 'علاقات الراوي', 'الرتبة عند ابن حجر', 'الرتبة عند الذهبي', 'الجرح والتعديل'];
  const dynamicFields = Object.keys(json.fields).filter(key => !standardFields.includes(key));

  return (
    <div className="reader-body" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      <section className="reader-toolbar">
        <div className="nav-container">
          <BackButton title="العودة لنتائج البحث" fallbackHref="/?tab=jarh" />
        </div>
      </section>

      <div className="reader-container" style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px', flex: '1' }}>
        <header style={{ marginBottom: '30px', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '36px', lineHeight: '1.6', fontWeight: 'bold', color: '#1a202c', marginBottom: '15px', fontFamily: '"Amiri", serif' }}>{name}</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', color: '#64748b', fontSize: '14px', justifyContent: 'center' }}>
            {kunya && <span style={{ backgroundColor: '#f1f5f9', padding: '4px 12px', borderRadius: '16px' }}><strong>الكنية:</strong> {kunya}</span>}
            {nasab && <span style={{ backgroundColor: '#f1f5f9', padding: '4px 12px', borderRadius: '16px' }}><strong>النسب:</strong> {nasab}</span>}
            {residence && <span style={{ backgroundColor: '#f1f5f9', padding: '4px 12px', borderRadius: '16px' }}><strong>الإقامة:</strong> {residence}</span>}
            {death && <span style={{ backgroundColor: '#f1f5f9', padding: '4px 12px', borderRadius: '16px' }}><strong>الوفاة:</strong> {death}</span>}
            {rankTabqa && <span style={{ backgroundColor: '#f1f5f9', padding: '4px 12px', borderRadius: '16px' }}><strong>الطبقة:</strong> {rankTabqa}</span>}
            <span style={{ backgroundColor: '#f1f5f9', padding: '4px 12px', borderRadius: '16px' }}><strong>المعرف:</strong> <span style={{ fontFamily: 'monospace' }}>{id}</span></span>
          </div>
        </header>

        <div style={{ fontSize: '18px', lineHeight: '1.8', color: '#334155' }}>
          {rankHajar && <div style={{ marginBottom: '8px' }}><strong>ابن حجر:</strong> <span style={{ color: '#1d4ed8' }}>{rankHajar}</span></div>}
          {rankDhahabi && <div style={{ marginBottom: '8px' }}><strong>الذهبي:</strong> <span style={{ color: '#15803d' }}>{rankDhahabi}</span></div>}
          
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: '"Amiri", serif', color: '#00538b', marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>أقوال الجرح والتعديل</h3>
            
            {jarhList.length > 0 ? (
              jarhList.reduce((acc, current, i, arr) => {
                if (i % 2 === 0) {
                  acc.push(
                    <div key={i} style={{ borderRight: '4px solid #00538b', backgroundColor: '#f8fafc', padding: '1.5rem', marginBottom: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', borderRightWidth: '4px' }}>
                      <span style={{ fontWeight: 'bold', color: '#00538b', marginBottom: '0.5rem', display: 'block', fontFamily: '"Amiri", serif', fontSize: '1.2rem' }}>{current}</span>
                      <p style={{ color: '#1a202c', lineHeight: '1.8', fontSize: '1.1rem' }}>{arr[i + 1] || '(بدون نص)'}</p>
                    </div>
                  );
                }
                return acc;
              }, [])
            ) : (
              <p style={{ color: '#64748b', fontStyle: 'italic' }}>لا توجد أقوال مسجلة.</p>
            )}
          </div>

          {dynamicFields.length > 0 && (
            <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', fontFamily: '"Amiri", serif', color: '#00538b', marginBottom: '1rem' }}>مصادر وأقوال أخرى</h3>
              {dynamicFields.map(key => (
                <div key={key} style={{ marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '1.125rem', color: '#1f2937' }}>"{key}"</p>
                  <p style={{ fontSize: '0.9rem', color: '#00538b', marginTop: '6px' }}>المصدر: {json.fields[key]?.stringValue}</p>
                </div>
              ))}
            </div>
          )}

          {relations && (
            <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.375rem' }}>
              <h4 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>علاقات الراوي</h4>
              <p style={{ color: '#374151' }}>{relations}</p>
            </div>
          )}
        </div>
      </div>

      <footer className="site-footer bg-slate-800 text-slate-300 py-6 text-center mt-auto" style={{ backgroundColor: '#1e293b', color: '#94a3b8', padding: '24px 0', textAlign: 'center' }}>
        <p style={{ margin: 0 }}>&copy; 2025 موسوعة البيان. جميع الحقوق محفوظة. (الإصدار 1.3.4)</p>
      </footer>
    </div>
  );
}
