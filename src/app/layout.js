import "./globals.css";

export const metadata = {
  title: " اسناد الحديث - الرئيسية",
  description: "محرك بحث موحد يجمع الحديث الشريف - صحة الحديث وتخريج الاحاديث و شرح الحديث، الفتاوى، تراجم العلماء والمحدثين، التاريخ وقواعد البيانات الإسلامية في واجهة واحدة.",
  icons: {
    icon: "/favicon.ico",
  },
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
