import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'مبدل Markdown به مقاله HTML | Markdown to Article HTML Converter',
  description: 'ابزار پیشرفته تبدیل کدهای مارک‌داون به مقاله‌های زیبا و استاندارد HTML با پشتیبانی از RTL، فرمول‌های ریاضی و قالب‌های علمی',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800&family=Lora:ital,wght@0,400..700;1,400..700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          integrity="sha384-nB0miv6/jRmo5UMMR1wu3Gz6NLsoTkbqJghGIsx//Rlm+ZU03BU6SQNC66U8qU+D"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css"
        />
      </head>
      <body className="bg-slate-900 text-slate-100 font-sans antialiased min-h-screen selection:bg-indigo-500 selection:text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
