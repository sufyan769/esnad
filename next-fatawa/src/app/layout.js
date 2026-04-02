import "./globals.css";

export const metadata = {
  title: "موسوعة البيان - الرئيسية",
  description: "محرك بحث موحد يجمع الحديث الشريف، الفتاوى، التراجم، التاريخ وقواعد البيانات الإسلامية في واجهة واحدة.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Noto+Naskh+Arabic:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
