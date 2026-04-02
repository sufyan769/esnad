export function updateSEO(title, description, url, type = 'WebPage') {
    if (!title || !description) return;
    const safeTitle = title.replace(/(<([^>]+)>)/gi, "").substring(0, 60);
    const safeDesc = description.replace(/(<([^>]+)>)/gi, "").substring(0, 160);
    
    document.title = safeTitle + ' | موسوعة البيان';
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
    }
    metaDesc.content = safeDesc;

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
    }
    // Clean up URL for canonical (remove query params if not needed, but here we DO need them! because ?id=123 determines the content)
    // Wait, for cleanUrls set in vercel, window.location.href will be /fatwa/123.
    canonical.href = url || window.location.href;

    const metas = {
        'og:title': safeTitle,
        'og:description': safeDesc,
        'og:type': type,
        'twitter:title': safeTitle,
        'twitter:description': safeDesc
    };

    for (const [key, val] of Object.entries(metas)) {
        let meta = document.querySelector(`meta[property="${key}"], meta[name="${key}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute(key.includes(':') ? (key.startsWith('og:') ? 'property' : 'name') : 'name', key);
            document.head.appendChild(meta);
        }
        meta.content = val;
    }

    let script = document.querySelector('script[type="application/ld+json"]');
    if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        document.head.appendChild(script);
    }
    script.text = JSON.stringify({
        "@context": "https://schema.org",
        "@type": type,
        "headline": safeTitle,
        "description": safeDesc,
        "url": url || window.location.href
    });
}
