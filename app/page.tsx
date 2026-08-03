'use client';

import React from 'react';
import { Header } from '@/components/Header';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { ArticlePreview } from '@/components/ArticlePreview';
import { HtmlCodeView } from '@/components/HtmlCodeView';
import { ArticleMetadataModal } from '@/components/ArticleMetadataModal';
import {
  ArticleMetadata,
  ArticleTheme,
  SAMPLE_MARKDOWNS,
  convertMarkdownToArticleHtml,
  generateStandaloneArticleHtml,
} from '@/lib/markdown-converter';

const INITIAL_METADATA: ArticleMetadata = {
  title: '',
  subtitle: '',
  author: '',
  affiliation: '',
  date: '',
  journal: '',
  abstract: '',
  keywords: '',
  direction: 'rtl',
  showToc: true,
  showMetadata: true,
  theme: 'academic',
  fontSize: 16,
  lineHeight: 1.8,
};

const DEFAULT_MARKDOWN = `# عنوان مقاله جدید

متن مقاله یا مستند خود را اینجا بنویسید...

## بخش اول

می‌توانید از علائم **مارک‌داون**، *فرمول‌های ریاضی*، جدول‌ها و کد استفاده کنید.
`;

export default function Home() {
  const [markdown, setMarkdown] = React.useState<string>(DEFAULT_MARKDOWN);
  const [metadata, setMetadata] = React.useState<ArticleMetadata>(INITIAL_METADATA);
  const [isLoaded, setIsLoaded] = React.useState(false);

  const [activeView, setActiveView] = React.useState<'split' | 'preview' | 'html'>('split');
  const [isFocusMode, setIsFocusMode] = React.useState(false);
  const [isMetadataOpen, setIsMetadataOpen] = React.useState(false);
  const [copiedState, setCopiedState] = React.useState(false);

  // Load saved state from localStorage after initial render to avoid hydration mismatch
  React.useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedMd = localStorage.getItem('md_article_content');
        const savedMeta = localStorage.getItem('md_article_metadata');
        if (savedMd) {
          // If savedMd was the old sample academic text, clear it so user starts fresh
          if (savedMd.includes('بررسی جامع شبکه‌های عصبی عمیق در پردازش زبان طبیعی')) {
            localStorage.removeItem('md_article_content');
            localStorage.removeItem('md_article_metadata');
          } else {
            setMarkdown(savedMd);
          }
        }
        if (savedMeta) {
          try {
            const parsed = JSON.parse(savedMeta);
            if (parsed.title?.includes('بررسی جامع شبکه‌های عصبی')) {
              localStorage.removeItem('md_article_metadata');
            } else {
              setMetadata(parsed);
            }
          } catch {}
        }
      } catch {}
      setIsLoaded(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Save state to localStorage after initial load completed
  React.useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('md_article_content', markdown);
      localStorage.setItem('md_article_metadata', JSON.stringify(metadata));
    } catch {
      // Ignore localStorage write errors
    }
  }, [markdown, metadata, isLoaded]);

  // Compute metrics
  const { wordCount, readTime } = React.useMemo(() => {
    return convertMarkdownToArticleHtml(markdown, metadata);
  }, [markdown, metadata]);

  // Actions
  const handleCopyHtml = (standalone: boolean) => {
    const content = standalone
      ? generateStandaloneArticleHtml(markdown, metadata)
      : convertMarkdownToArticleHtml(markdown, metadata).bodyHtml;

    navigator.clipboard.writeText(content);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  const handleDownloadHtml = () => {
    const content = generateStandaloneArticleHtml(markdown, metadata);
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = (metadata.title || 'article')
      .toLowerCase()
      .replace(/[^\w\u0600-\u06FF]+/g, '-') + '.html';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setMarkdown(text);
        // Extract first heading as title if present
        const match = text.match(/^#\s+(.+)$/m);
        if (match && match[1]) {
          setMetadata((prev) => ({ ...prev, title: match[1].trim() }));
        }
      }
    };
    reader.readAsText(file);
  };

  const handleUpdateMetadata = (updated: Partial<ArticleMetadata>) => {
    setMetadata((prev) => ({ ...prev, ...updated }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Header & Navigation */}
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        selectedTheme={metadata.theme}
        setSelectedTheme={(theme: ArticleTheme) => setMetadata((prev) => ({ ...prev, theme }))}
        onOpenMetadata={() => setIsMetadataOpen(true)}
        onCopyHtml={handleCopyHtml}
        onDownloadHtml={handleDownloadHtml}
        onPrintPdf={handlePrintPdf}
        onFileUpload={handleFileUpload}
        copiedState={copiedState}
        isFocusMode={isFocusMode}
        onToggleFocusMode={() => setIsFocusMode((prev) => !prev)}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 p-2 sm:p-4 max-w-7xl w-full mx-auto flex flex-col">
        {isFocusMode ? (
          <div className="flex-1 max-w-4xl w-full mx-auto h-[calc(100vh-100px)]">
            <MarkdownEditor
              markdown={markdown}
              setMarkdown={setMarkdown}
              wordCount={wordCount}
              readTime={readTime}
            />
          </div>
        ) : (
          <>
            {activeView === 'split' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 h-[calc(100vh-100px)]">
                <MarkdownEditor
                  markdown={markdown}
                  setMarkdown={setMarkdown}
                  wordCount={wordCount}
                  readTime={readTime}
                />
                <div className="h-full overflow-hidden rounded-2xl border border-slate-800">
                  <ArticlePreview markdown={markdown} metadata={metadata} onUpdateMetadata={handleUpdateMetadata} />
                </div>
              </div>
            )}

            {activeView === 'preview' && (
              <div className="flex-1 min-h-[calc(100vh-120px)]">
                <ArticlePreview markdown={markdown} metadata={metadata} onUpdateMetadata={handleUpdateMetadata} />
              </div>
            )}

            {activeView === 'html' && (
              <div className="flex-1 h-[calc(100vh-120px)]">
                <HtmlCodeView markdown={markdown} metadata={metadata} />
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <ArticleMetadataModal
        isOpen={isMetadataOpen}
        onClose={() => setIsMetadataOpen(false)}
        metadata={metadata}
        setMetadata={setMetadata}
      />
    </div>
  );
}
