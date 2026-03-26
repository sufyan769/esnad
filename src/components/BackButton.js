"use client";

import { useRouter } from "next/navigation";

export default function BackButton({ title = "العودة للنتائج", fallbackHref = "/" }) {
  const router = useRouter();

  const handleBack = (e) => {
    e.preventDefault();
    if (window.history.length > 2) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <a href={fallbackHref} onClick={handleBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#00538b', textDecoration: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
      <span>&rarr; {title}</span>
    </a>
  );
}
