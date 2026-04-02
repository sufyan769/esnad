"use client";

import React, { useState, useEffect, useRef } from 'react';
import algoliasearch from 'algoliasearch/lite';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, query, where, limit, getDocs } from "firebase/firestore";
import Link from 'next/link';
import { Search, BookOpenCheck, Users, Scroll, Scale, Book, Database, SearchX, BookOpen } from 'lucide-react';

const CONFIG = {
  hadith: {
    appId: '88G4AVERCC',
    apiKey: '76402a5d814264e01fb86ca687d26e30',
    indexName: 'firebase-hadeth',
    firebaseCollection: 'hadiths'
  },
  history: {
    appId: '88G4AVERCC',
    apiKey: '33b0b484f534b2ae2dac948d588345a6',
    indexName: 'algolia_unified'
  },
  scholars: {
    appId: '3XD12I7386',
    apiKey: '981ea91e88c65be8aadf2113c207b9c5',
    indexName: 'trajum'
  },
  fatawa: {
    appId: '3XD12I7386',
    apiKey: '89e8e132a05fdb02275f64dec8d14d05',
    indexName: 'alfatawa'
  },
  firebase: {
    apiKey: "AIzaSyBYJ2pVoWJ5ednWOnnF2dOJ43MJvDi_8rw",
    projectId: "hadeth-7baf7",
  },
  scholarFirebase: {
    apiKey: "AIzaSyBni4eUpBlMrBVr-I-_bTLDyYpdJgkBnpw",
    projectId: "islsm-9",
  },
  jarhFirebase: {
    apiKey: "AIzaSyBjkJ45NsQgz1c7V1mUsnrORMYx8WceDdQ",
    projectId: "trajum-almaktaba",
  }
};

const PLACEHOLDER_DOMAIN = 'https://your-site.com';
const stripPlaceholderDomain = (value = '') => value ? value.split(PLACEHOLDER_DOMAIN).join('') : '';
const truncateText = (text = '', length = 220) => text.length > length ? `${text.substring(0, length)}...` : text;

const PLACEHOLDERS = {
  all: "البحث في جميع الأقسام...",
  hadith: "",
  history: "",
  scholars: "",
  jarh: "",
  fatawa: "",
  firebase: ""
};

let db, scholarDb, jarhDb, clients;

export default function SearchApp() {
  const [currentTab, setCurrentTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [featuredFatwas, setFeaturedFatwas] = useState(null);
  const [featuredScholars, setFeaturedScholars] = useState(null);

  useEffect(() => {
    // Initialize standard clients once on mount
    if (!db) {
      const getOrCreateApp = (config, name) => getApps().find(a => a.name === name) ? getApp(name) : initializeApp(config, name);
      
      const app = getOrCreateApp(CONFIG.firebase, "main_firebase");
      db = getFirestore(app);
      
      const scholarApp = getOrCreateApp(CONFIG.scholarFirebase, "main_scholarApp");
      scholarDb = getFirestore(scholarApp);
      
      const jarhApp = getOrCreateApp(CONFIG.jarhFirebase, "main_jarhApp");
      jarhDb = getFirestore(jarhApp);

      clients = {
        hadith: algoliasearch(CONFIG.hadith.appId, CONFIG.hadith.apiKey).initIndex(CONFIG.hadith.indexName),
        history: algoliasearch(CONFIG.history.appId, CONFIG.history.apiKey).initIndex(CONFIG.history.indexName),
        scholars: algoliasearch(CONFIG.scholars.appId, CONFIG.scholars.apiKey).initIndex(CONFIG.scholars.indexName),
        fatawa: algoliasearch(CONFIG.fatawa.appId, CONFIG.fatawa.apiKey).initIndex(CONFIG.fatawa.indexName)
      };
    }

    // Load URL params
    const searchParams = new URLSearchParams(window.location.search);
    const paramTab = searchParams.get('tab');
    const paramQuery = searchParams.get('q');
    
    if (paramTab && PLACEHOLDERS[paramTab]) setCurrentTab(paramTab);
    
    if (paramQuery) {
      setSearchTerm(paramQuery);
      handleSearchSubmit(paramQuery, paramTab || 'all');
    } else {
      loadCuratedSections();
      if (paramTab && paramTab !== 'all' && paramTab !== 'firebase' && paramTab !== 'jarh') {
        setTimeout(() => loadRandomTabResults(paramTab), 500); // Delayed to wait for Algolia init logic
      }
    }
  }, []);

  const syncUrl = (tab, query) => {
    const url = new URL(window.location);
    if (tab && tab !== 'all') {
      url.searchParams.set('tab', tab);
    } else {
      url.searchParams.delete('tab');
    }
    if (query) {
      url.searchParams.set('q', query);
    } else {
      url.searchParams.delete('q');
    }
    window.history.replaceState({}, '', url);
  };

  const handleTabClick = (tabId) => {
    setCurrentTab(tabId);
    if (searchTerm.trim()) {
      handleSearchSubmit(searchTerm.trim(), tabId);
    } else {
      syncUrl(tabId, '');
      if (tabId !== 'all' && tabId !== 'firebase' && tabId !== 'jarh') {
        loadRandomTabResults(tabId);
      } else {
        setResults([]);
        setHasSearched(false);
      }
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) handleSearchSubmit(searchTerm.trim(), currentTab);
  };

  const searchFirebaseDocs = async (term, size = 10) => {
    if (!term) return [];
    const trimmed = term.trim();
    const colRef = collection(scholarDb, "scholars_biographies");
    let snapshot = await getDocs(query(colRef, where("aliases", "array-contains", trimmed), limit(size)));
    if (snapshot.empty && trimmed.includes(' ')) {
      const fallback = trimmed.split(' ')[0];
      if (fallback.length >= 3) {
        snapshot = await getDocs(query(colRef, where("aliases", "array-contains", fallback), limit(size)));
      }
    }
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  };

  const searchJarhDocs = async (term, size = 10) => {
    if (!term) return [];
    const trimmed = term.trim();
    const colRef = collection(jarhDb, "scholars");
    let snapshot = await getDocs(query(colRef, where("الاسم", ">=", trimmed), where("الاسم", "<=", trimmed + '\uf8ff'), limit(size)));
    if (snapshot.empty && !isNaN(trimmed)) {
      const numSnap = await getDocs(query(colRef, where("id", "==", Number(trimmed)), limit(1)));
      return numSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  };

  const hydrateHadithResults = async (hits) => {
    const promises = hits.map(async (hit) => {
      try {
        const docRef = doc(db, CONFIG.hadith.firebaseCollection, hit.objectID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) return { ...hit, ...docSnap.data() };
        return hit;
      } catch (e) { return hit; }
    });
    return Promise.all(promises);
  };

  const loadRandomTabResults = async (tab) => {
    if (!clients || !clients[tab]) return;
    setIsSearching(true);
    setHasSearched(true);
    try {
      const maxPages = tab === 'hadith' ? 100 : 50; 
      const randomPage = Math.floor(Math.random() * maxPages);
      let res = await clients[tab].search('', { hitsPerPage: 10, page: randomPage });
      
      if (!res.hits || res.hits.length === 0) {
        // Fallback to a lower page range if we hit an empty page
        const lowerRandomPage = Math.floor(Math.random() * 5);
        res = await clients[tab].search('', { hitsPerPage: 10, page: lowerRandomPage });
      }
      
      if (!res.hits || res.hits.length === 0) {
        res = await clients[tab].search('', { hitsPerPage: 10, page: 0 });
      }
      
      let hits = res.hits || [];
      if (tab === 'hadith') hits = await hydrateHadithResults(hits);
      const tempResults = formatResults(hits, tab, '');
      setResults(tempResults);
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = async (term, tab) => {
    setIsSearching(true);
    setHasSearched(true);
    syncUrl(tab, term);

    try {
      let tempResults = [];
      if (tab === 'all') {
        const [hadithRes, historyRes, scholarsRes, fatawaRes, firebaseDocs] = await Promise.all([
          clients.hadith.search(term, { hitsPerPage: 5 }),
          clients.history.search(term, { hitsPerPage: 5 }),
          clients.scholars.search(term, { hitsPerPage: 5 }),
          clients.fatawa.search(term, { hitsPerPage: 5 }),
          searchFirebaseDocs(term, 5)
        ]);

        const hydratedHadith = await hydrateHadithResults(hadithRes.hits);
        tempResults = [
          ...formatResults(hydratedHadith, 'hadith', term),
          ...formatResults(scholarsRes.hits, 'scholars', term),
          ...formatResults(historyRes.hits, 'history', term),
          ...formatResults(fatawaRes.hits, 'fatawa', term),
          ...formatResults(firebaseDocs, 'firebase', term),
          ...formatResults(await searchJarhDocs(term, 5), 'jarh', term)
        ];
      } else if (tab === 'firebase') {
        const docs = await searchFirebaseDocs(term, 20);
        tempResults = formatResults(docs, 'firebase', term);
      } else if (tab === 'jarh') {
        const docs = await searchJarhDocs(term, 20);
        tempResults = formatResults(docs, 'jarh', term);
      } else {
        const res = await clients[tab].search(term, { hitsPerPage: 20 });
        let hits = res.hits;
        if (tab === 'hadith') hits = await hydrateHadithResults(hits);
        tempResults = formatResults(hits, tab, term);
      }

      setResults(tempResults);
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const loadCuratedSections = async () => {
    const randomPageFatwa = Math.floor(Math.random() * 50);
    const randomPageScholar = Math.floor(Math.random() * 50);
    try {
      const [fatwaRes, scholarRes] = await Promise.all([
        clients.fatawa.search('', { hitsPerPage: 5, page: randomPageFatwa, attributesToRetrieve: ['question', 'source', 'objectID', 'id'] }),
        clients.scholars.search('', { hitsPerPage: 5, page: randomPageScholar, attributesToRetrieve: ['name', 'death', 'trj', 'objectID', 'id'] })
      ]);
      setFeaturedFatwas(fatwaRes.hits || []);
      setFeaturedScholars(scholarRes.hits || []);
    } catch (error) {
      setFeaturedFatwas([]);
      setFeaturedScholars([]);
    }
  };

  const formatResults = (hits, type, queryTerm) => {
    const SNIPPET_LENGTH = 110; // Approximately a line and a half for typical screen width
    return hits.map(hit => {
      let title = '', snippet = '', link = '#', metaHtml = '';
      if (type === 'hadith') {
        title = hit.text || "حديث شريف";
        const metaParts = [];
        if (hit.rawi) metaParts.push('الراوي: ' + (Array.isArray(hit.rawi) ? hit.rawi.join(', ') : hit.rawi));
        if (hit.hukm) metaParts.push('الحكم: ' + (Array.isArray(hit.hukm) ? hit.hukm[0] : hit.hukm));
        if (hit.muhaddith) metaParts.push('المحدث: ' + hit.muhaddith);
        snippet = metaParts.join(' • ');
        link = `/hadith/${hit.objectID}`;
        metaHtml = `<span class="badge badge-info">حديث</span>`;
      } else if (type === 'scholars') {
        title = hit.name || "بطاقة تراجم";
        snippet = hit.trj ? hit.trj.substring(0, SNIPPET_LENGTH) + "..." : "";
        link = `/scholar/${hit.objectID || hit.id}`;
        metaHtml = `<span class="badge badge-info">تراجم</span> ${hit.death ? 'توفي: ' + hit.death : ''}`;
      } else if (type === 'history') {
        title = hit.name || "بدون عنوان";
        const content = hit.full_intro || hit.text || "";
        snippet = content.substring(0, SNIPPET_LENGTH) + "...";
        link = `/history/${hit.objectID}`;
        metaHtml = `<span class="badge badge-warning">سير الأعلام</span>`;
      } else if (type === 'fatawa') {
        title = stripPlaceholderDomain(hit.question || "فتوى");
        const answerPreview = stripPlaceholderDomain(hit.answer_snippet || hit.answer || hit.text || "لا يوجد نص.");
        snippet = truncateText(answerPreview, SNIPPET_LENGTH);
        link = `/fatwa/${hit.objectID || hit.id}`;
        metaHtml = `<span class="badge badge-info">فتوى</span> ${hit.source ? hit.source.replace('.html', '') : ''}`;
      } else if (type === 'firebase') {
        title = hit.name || "سيرة معرفية";
        snippet = (hit.trj || hit.summary || "").substring(0, SNIPPET_LENGTH) + "...";
        link = `/scholar/${hit.id || hit.objectID}`;
        metaHtml = `<span class="badge badge-success">بحث مباشر</span>`;
      } else if (type === 'jarh') {
        title = hit['الاسم'] || "راوي بدون اسم";
        snippet = `ابن حجر: ${hit['الرتبة عند ابن حجر'] || '-'} | الذهبي: ${hit['الرتبة عند الذهبي'] || '-'}`;
        link = `/jarh/${hit.id || hit.objectID}`;
        metaHtml = `<span class="badge badge-warning">الجرح والتعديل</span>`;
      }
      return { type, title, snippet, link, metaHtml, raw: hit };
    });
  };

  return (
    <div className="min-h-screen font-sans flex flex-col">
      <nav className="main-nav hidden md:block">
        <div className="nav-container">
          <Link href="/" className="nav-logo">
            <span className="brand-mark">
              <span className="brand-slate">موسوعة</span> <span className="brand-accent">البيان</span>
            </span>
          </Link>
          <div className="nav-links">
            <button onClick={() => handleTabClick('hadith')} className={`nav-link ${currentTab === 'hadith' ? 'active' : ''}`}><BookOpenCheck className="w-4 h-4" /> الحديث الشريف</button>
            <button onClick={() => handleTabClick('scholars')} className={`nav-link ${currentTab === 'scholars' ? 'active' : ''}`}><Users className="w-4 h-4" /> تراجم العلماء</button>
            <button onClick={() => handleTabClick('history')} className={`nav-link ${currentTab === 'history' ? 'active' : ''}`}><Scroll className="w-4 h-4" /> سير الأعلام</button>
            <button onClick={() => handleTabClick('jarh')} className={`nav-link ${currentTab === 'jarh' ? 'active' : ''}`}><Scale className="w-4 h-4" /> الجرح والتعديل</button>
            <button onClick={() => handleTabClick('fatawa')} className={`nav-link ${currentTab === 'fatawa' ? 'active' : ''}`}><Book className="w-4 h-4" /> موسوعة الفتاوى</button>
            <button onClick={() => handleTabClick('firebase')} className={`nav-link ${currentTab === 'firebase' ? 'active' : ''}`}><Database className="w-4 h-4" /> بحث Firebase</button>
          </div>
        </div>
      </nav>

      <main className="simple-shell flex-grow">
        <section className="search-stack search-stack--compact">
          <div className="search-tabs">
            {['all', 'hadith', 'scholars', 'history', 'jarh', 'fatawa', 'firebase'].map(t => (
              <button key={t} className={`search-tab ${currentTab === t ? 'active' : ''}`} onClick={() => handleTabClick(t)}>
                {t === 'all' ? 'الكل' : t === 'hadith' ? 'الحديث' : t === 'scholars' ? 'التراجم' : t === 'history' ? 'سير الأعلام' : t === 'jarh' ? 'الجرح' : t === 'fatawa' ? 'الفتاوى' : 'Firebase'}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="search-input-wrapper search-input-wrapper--full">
            <button type="submit" className="search-btn">
              <Search className="w-6 h-6" />
            </button>
            <input type="text" className="search-input" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={PLACEHOLDERS[currentTab]} />
          </form>
        </section>

        <section className={`results-panel ${hasSearched ? '' : 'hidden'}`}>
          {isSearching && (
            <div className="state-card flex flex-col items-center justify-center p-8 text-slate-500">
              <div className="w-8 h-8 border-4 border-t-blue-600 border-blue-200 rounded-full animate-spin mb-4"></div>
              <p>جاري البحث في المصادر...</p>
            </div>
          )}
          
          {!isSearching && results.length === 0 && hasSearched && (
            <div className="state-card flex flex-col items-center justify-center p-8 text-slate-500">
              <SearchX className="w-12 h-12 mb-4 opacity-50" />
              <h3 className="font-bold text-lg mb-2">لم يتم العثور على نتائج</h3>
              <p>حاول استخدام كلمات مختلفة أو تأكد من الإملاء.</p>
            </div>
          )}

          {!isSearching && results.length > 0 && (
            <div className="results-list">
              {results.map((item, i) => (
                <div key={i} className="result-item" style={{ borderBottom: '1px solid #e2e8f0', padding: '16px 0' }}>
                  <div className="result-meta text-xs mb-2" dangerouslySetInnerHTML={{ __html: item.metaHtml }}></div>
                  <h3 className="result-title text-xl font-bold font-serif mb-2 text-blue-800 hover:text-blue-600 transition-colors">
                    <Link href={item.link} className="no-underline hover:no-underline" style={{ textDecoration: 'none' }}>{item.title}</Link>
                  </h3>
                  <div className="result-snippet text-slate-600 leading-relaxed text-sm">
                    {item.snippet}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {!hasSearched && (
          <section className="curated-grid grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 px-4 max-w-6xl mx-auto">
            <div className="curated-section bg-slate-50 p-6 rounded-xl border border-slate-200">
              <header className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
                <h3 className="font-serif font-bold text-xl text-slate-800">فتاوى مختارة</h3>
                <Link href="/?tab=fatawa" className="text-sm font-bold text-blue-600 hover:text-blue-800">عرض الكل</Link>
              </header>
              <div className="curated-list space-y-4">
                {!featuredFatwas ? <p className="text-slate-500">جاري تحميل الفتاوى...</p> : featuredFatwas.map(hit => (
                  <Link key={hit.objectID} href={`/fatwa/${hit.objectID}`} className="block group p-3 hover:bg-white rounded transition">
                    <p className="font-bold text-slate-800 group-hover:text-blue-700 leading-tight mb-2">
                      {truncateText(stripPlaceholderDomain(hit.question), 60)}
                    </p>
                    <p className="text-xs text-slate-500">{hit.source?.replace('.html', '')}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="curated-section bg-slate-50 p-6 rounded-xl border border-slate-200">
              <header className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
                <h3 className="font-serif font-bold text-xl text-slate-800">مختارات من التراجم</h3>
                <Link href="/?tab=scholars" className="text-sm font-bold text-blue-600 hover:text-blue-800">عرض الكل</Link>
              </header>
              <div className="curated-list space-y-4">
                {!featuredScholars ? <p className="text-slate-500">جاري تحميل التراجم...</p> : featuredScholars.map(hit => (
                  <Link key={hit.objectID} href={`/scholar/${hit.objectID || hit.id}`} className="block group p-3 hover:bg-white rounded transition">
                    <p className="font-bold text-slate-800 group-hover:text-blue-700 leading-tight mb-2">{hit.name || 'بطاقة ترجمة'}</p>
                    <p className="text-xs text-slate-500">{hit.death ? `توفي سنة ${hit.death}` : truncateText(hit.trj, 80)}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="site-footer bg-slate-800 text-slate-300 py-6 text-center mt-12">
        <p>&copy; 2025 موسوعة البيان. جميع الحقوق محفوظة. (الإصدار 1.3.3)</p>
      </footer>
    </div>
  );
}
