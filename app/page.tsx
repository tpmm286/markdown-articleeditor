'use client';

import React from 'react';
import { Header } from '@/components/Header';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { ArticlePreview } from '@/components/ArticlePreview';
import { HtmlCodeView } from '@/components/HtmlCodeView';
import { ArticleMetadataModal } from '@/components/ArticleMetadataModal';
import { ProjectDraftModal } from '@/components/ProjectDraftModal';
import { SnippetModal } from '@/components/SnippetModal';
import { importProjectDraft } from '@/lib/project-manager';
import {
  ArticleMetadata,
  ArticleTheme,
  convertMarkdownToArticleHtml,
  generateStandaloneArticleHtml,
  countWordsFast,
} from '@/lib/markdown-converter';
import { generateArticleZipPackage, safeDownloadBlob } from '@/lib/article-packager';
import { CheckCircle2, AlertCircle } from 'lucide-react';

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

می‌توانید از علائم **مارک‌داون**، *فرمول‌های ریاضی*، جدول‌ها، صوت و تصویر استفاده کنید.
`;

export default function Home() {
  const [markdown, setMarkdown] = React.useState<string>(DEFAULT_MARKDOWN);
  const [debouncedMarkdown, setDebouncedMarkdown] = React.useState<string>(DEFAULT_MARKDOWN);
  const [metadata, setMetadata] = React.useState<ArticleMetadata>(INITIAL_METADATA);
  const [isLoaded, setIsLoaded] = React.useState(false);

  const [activeView, setActiveView] = React.useState<'split' | 'preview' | 'html'>('split');
  const [isFocusMode, setIsFocusMode] = React.useState(false);
  const [isMetadataOpen, setIsMetadataOpen] = React.useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = React.useState(false);
  const [isSnippetModalOpen, setIsSnippetModalOpen] = React.useState(false);
  const [editorScrollTop, setEditorScrollTop] = React.useState(0);
  const [copiedState, setCopiedState] = React.useState(false);
  const [isExportingZip, setIsExportingZip] = React.useState(false);
  const [isExportingHtml, setIsExportingHtml] = React.useState(false);
  const [exportToast, setExportToast] = React.useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null);

  const isProcessing = markdown !== debouncedMarkdown;

  // Debounce markdown rendering for preview/HTML views so large documents (80+ pages) do not lock the UI
  React.useEffect(() => {
    if (markdown === debouncedMarkdown) return;

    // Faster debounce for smaller documents, slightly longer for very large documents
    const delay = markdown.length > 50000 ? 350 : 200;
    const timer = setTimeout(() => {
      setDebouncedMarkdown(markdown);
    }, delay);

    return () => clearTimeout(timer);
  }, [markdown, debouncedMarkdown]);

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
            setDebouncedMarkdown(savedMd);
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

  // Save state to localStorage after initial load completed (debounced and size-checked)
  React.useEffect(() => {
    if (!isLoaded) return;
    const saveTimer = setTimeout(() => {
      try {
        // Safe check for quota limits (localStorage ~5MB)
        if (markdown.length < 3000000) {
          localStorage.setItem('md_article_content', markdown);
        }
        localStorage.setItem('md_article_metadata', JSON.stringify(metadata));
      } catch {
        // Ignore localStorage write errors or quota overflow
      }
    }, 600);

    return () => clearTimeout(saveTimer);
  }, [markdown, metadata, isLoaded]);

  // Fast word count calculation without blocking the main thread
  const { wordCount, readTime } = React.useMemo(() => {
    const words = countWordsFast(markdown);
    const time = Math.max(1, Math.ceil(words / 180));
    return { wordCount: words, readTime: time };
  }, [markdown]);

  // Actions
  const handleCopyHtml = async (standalone: boolean) => {
    try {
      const content = standalone
        ? generateStandaloneArticleHtml(markdown, metadata, { minify: true })
        : convertMarkdownToArticleHtml(markdown, metadata).bodyHtml;

      await navigator.clipboard.writeText(content);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    } catch (err) {
      console.error('Copy HTML error:', err);
    }
  };

  const handleDownloadHtml = () => {
    try {
      setIsExportingHtml(true);
      setExportToast({ type: 'info', message: 'در حال آماده‌سازی و دانلود فایل HTML...' });

      const content = generateStandaloneArticleHtml(markdown, metadata, { minify: true });
      const blob = new Blob([content], { type: 'text/html;charset=utf-8' });

      let cleanTitle = (metadata.title || 'article')
        .toLowerCase()
        .replace(/[^\w\u0600-\u06FF\s-]+/g, '')
        .trim()
        .replace(/\s+/g, '-');
      if (!cleanTitle) cleanTitle = 'article';

      safeDownloadBlob(blob, `${cleanTitle}.html`);
      setExportToast({ type: 'success', message: 'فایل HTML مقاله با موفقیت دانلود شد!' });
      setTimeout(() => setExportToast(null), 3000);
    } catch (err) {
      console.error('Download error:', err);
      setExportToast({
        type: 'error',
        message: 'خطا در خروجی تک‌فایلی HTML. در صورت وجود فایل‌های صوتی سنگین، لطفاً از گزینه «دانلود بسته ZIP» استفاده فرمایید.',
      });
      setTimeout(() => setExportToast(null), 6000);
    } finally {
      setIsExportingHtml(false);
    }
  };

  const handleDownloadZip = async () => {
    try {
      setIsExportingZip(true);
      setExportToast({ type: 'info', message: 'در حال استخراج صوت‌ها، تصاویر و فشرده‌سازی پکیج ZIP...' });

      const result = await generateArticleZipPackage(markdown, metadata);
      safeDownloadBlob(result.blob, result.filename);

      setExportToast({
        type: 'success',
        message: `بسته فشرده ZIP مقاله با موفقیت ایجاد و دانلود شد! (حجم: ${result.stats.zipSizeKb} KB شامل ${result.stats.imageCount} تصویر و ${result.stats.audioCount} فایل صوتی)`,
      });
      setTimeout(() => setExportToast(null), 6000);
    } catch (err) {
      console.error('ZIP download error:', err);
      setExportToast({ type: 'error', message: 'خطا در ساخت پکیج فشرده ZIP. لطفاً مجدداً امتحان کنید.' });
      setTimeout(() => setExportToast(null), 5000);
    } finally {
      setIsExportingZip(false);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const handleRestoreProject = (newMarkdown: string, newMetadata: ArticleMetadata, assetCount: number) => {
    setMarkdown(newMarkdown);
    setDebouncedMarkdown(newMarkdown);
    setMetadata(newMetadata);
    setExportToast({
      type: 'success',
      message: `پروژه با موفقیت بازیابی شد! (${assetCount} فایل صوتی و تصویری فعال بارگذاری گردید)`,
    });
    setTimeout(() => setExportToast(null), 5000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // If user selected an mdpress, zip, or json project draft
    if (file.name.endsWith('.mdpress') || file.name.endsWith('.zip') || file.name.endsWith('.json')) {
      try {
        setExportToast({ type: 'info', message: 'در حال خواندن و بارگذاری فایل پروژه...' });
        const result = await importProjectDraft(file);
        handleRestoreProject(result.markdown, result.metadata, result.assetCount);
        return;
      } catch {
        // Fall through to plain text reader
      }
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setMarkdown(text);
        setDebouncedMarkdown(text);
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
        onOpenProjectManager={() => setIsProjectModalOpen(true)}
        onOpenSnippets={() => setIsSnippetModalOpen(true)}
        onCopyHtml={handleCopyHtml}
        onDownloadHtml={handleDownloadHtml}
        onDownloadZip={handleDownloadZip}
        onPrintPdf={handlePrintPdf}
        onFileUpload={handleFileUpload}
        copiedState={copiedState}
        isFocusMode={isFocusMode}
        onToggleFocusMode={() => setIsFocusMode((prev) => !prev)}
        isExportingZip={isExportingZip}
        isExportingHtml={isExportingHtml}
      />

      {/* Floating Status / Download Toast Notification */}
      {exportToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`px-4 py-2.5 rounded-2xl border shadow-xl flex items-center gap-2.5 text-xs md:text-sm font-medium backdrop-blur-md ${
              exportToast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : exportToast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                : 'bg-slate-900/90 border-indigo-500/50 text-indigo-200'
            }`}
          >
            {exportToast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {exportToast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {exportToast.type === 'info' && <span className="animate-spin text-sm">⏳</span>}
            <span>{exportToast.message}</span>
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <main className={`flex-1 ${isFocusMode ? 'pt-0 px-2 pb-2 sm:px-4 sm:pb-4' : 'p-2 sm:p-4'} max-w-7xl w-full mx-auto flex flex-col`}>
        {isFocusMode ? (
          <div className="flex-1 max-w-4xl w-full mx-auto h-[100vh] pt-0 mt-0">
            <MarkdownEditor
              markdown={markdown}
              setMarkdown={setMarkdown}
              wordCount={wordCount}
              readTime={readTime}
              snippets={metadata.snippets}
              scrollTop={editorScrollTop}
              onScroll={setEditorScrollTop}
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
                  snippets={metadata.snippets}
                  scrollTop={editorScrollTop}
                  onScroll={setEditorScrollTop}
                />
                <div className="h-full overflow-hidden rounded-2xl border border-slate-800">
                  <ArticlePreview
                    markdown={debouncedMarkdown}
                    metadata={metadata}
                    onUpdateMetadata={handleUpdateMetadata}
                    isProcessing={isProcessing}
                  />
                </div>
              </div>
            )}

            {activeView === 'preview' && (
              <div className="flex-1 min-h-[calc(100vh-120px)]">
                <ArticlePreview
                  markdown={debouncedMarkdown}
                  metadata={metadata}
                  onUpdateMetadata={handleUpdateMetadata}
                  isProcessing={isProcessing}
                />
              </div>
            )}

            {activeView === 'html' && (
              <div className="flex-1 h-[calc(100vh-120px)]">
                <HtmlCodeView
                  markdown={debouncedMarkdown}
                  metadata={metadata}
                  onDownloadHtml={handleDownloadHtml}
                  onDownloadZip={handleDownloadZip}
                />
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

      <ProjectDraftModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        markdown={markdown}
        metadata={metadata}
        onRestoreProject={handleRestoreProject}
      />

      <SnippetModal
        isOpen={isSnippetModalOpen}
        onClose={() => setIsSnippetModalOpen(false)}
        snippets={metadata.snippets || []}
        onUpdateSnippets={(snippets) => setMetadata((prev) => ({ ...prev, snippets }))}
      />
    </div>
  );
}
