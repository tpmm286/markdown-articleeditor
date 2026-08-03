'use client';

import React from 'react';
import { ArticleMetadata, ReadingMode, convertMarkdownToArticleHtml } from '@/lib/markdown-converter';
import { BookOpen, Calendar, User, Building, Bookmark, Clock, Sun, Moon, Book, RefreshCw, Printer } from 'lucide-react';

interface ArticlePreviewProps {
  markdown: string;
  metadata: ArticleMetadata;
  onUpdateMetadata?: (updated: Partial<ArticleMetadata>) => void;
}

const emptySubscribe = () => () => {};

export const ArticlePreview: React.FC<ArticlePreviewProps> = ({ markdown, metadata, onUpdateMetadata }) => {
  const isClient = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [localMode, setLocalMode] = React.useState<ReadingMode | null>(null);

  const modeToUse = localMode ?? metadata.readingMode ?? 'auto';

  // Determine active visual mode ('day' | 'night' | 'reading')
  const activeMode = React.useMemo(() => {
    if (!isClient) {
      return metadata.readingMode && metadata.readingMode !== 'auto' ? metadata.readingMode : 'day';
    }
    if (modeToUse === 'auto') {
      const hour = new Date().getHours();
      const isDarkSys = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      return isDarkSys || hour >= 19 || hour < 7 ? 'night' : 'day';
    }
    return modeToUse;
  }, [isClient, modeToUse, metadata.readingMode]);

  const handleModeChange = (mode: ReadingMode) => {
    setLocalMode(mode);
    if (onUpdateMetadata) {
      onUpdateMetadata({ readingMode: mode });
    }
  };

  const { bodyHtml, toc, wordCount, readTime } = React.useMemo(() => {
    return convertMarkdownToArticleHtml(markdown, metadata);
  }, [markdown, metadata]);

  const displayTitle = React.useMemo(() => {
    if (metadata.title) return metadata.title;
    const match = markdown.match(/^#\s+(.+)$/m);
    return match ? match[1].replace(/[*_~`]/g, '').trim() : '';
  }, [markdown, metadata.title]);

  const isRtl = metadata.direction === 'rtl' || metadata.direction === 'auto';
  const dir = isRtl ? 'rtl' : 'ltr';

  // Mode-aware wrapper styles
  const getModeStyles = () => {
    if (activeMode === 'night') {
      return {
        outerBg: 'bg-slate-950',
        sheet: 'bg-slate-900 text-slate-100 border-slate-800 shadow-slate-950/50',
        headerText: 'text-white',
        subtitleText: 'text-slate-400',
        metaBg: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
        abstractBg: 'bg-slate-800/50 border-indigo-500 text-slate-200',
        tocBg: 'bg-slate-800/50 border-slate-700 text-slate-200',
        bodyClass: 'text-slate-200',
      };
    } else if (activeMode === 'reading') {
      return {
        outerBg: 'bg-[#f3edd8]',
        sheet: 'bg-[#fbf0d9] text-[#3b2d1d] border-[#e2d5bd] shadow-amber-900/10',
        headerText: 'text-[#2e2011]',
        subtitleText: 'text-[#5a4834]',
        metaBg: 'bg-[#f3e3c3] text-[#4a3a28] border-[#dfceb1]',
        abstractBg: 'bg-[#f3e3c3]/90 border-amber-700 text-[#3b2d1d]',
        tocBg: 'bg-[#f3e3c3]/90 border-[#dfceb1] text-[#3b2d1d]',
        bodyClass: 'text-[#3b2d1d]',
      };
    } else {
      // Day / Light
      return {
        outerBg: 'bg-slate-200/60',
        sheet: 'bg-white text-slate-900 border-slate-200/90 shadow-2xl',
        headerText: 'text-slate-900',
        subtitleText: 'text-slate-600',
        metaBg: 'bg-slate-100/90 text-slate-700 border-slate-200/80',
        abstractBg: 'bg-slate-50 border-indigo-600 text-slate-800',
        tocBg: 'bg-slate-50 border-slate-200/90 text-slate-700',
        bodyClass: 'text-slate-800',
      };
    }
  };

  const modeStyles = getModeStyles();

  // Layout Theme specific borders
  const getLayoutBorderClass = () => {
    switch (metadata.theme) {
      case 'academic':
        return 'border-t-8 border-indigo-900 font-serif';
      case 'journalistic':
        return 'border-t-8 border-rose-700 font-sans';
      case 'technical':
        return 'border-r-8 border-sky-600 font-sans';
      case 'classic':
        return 'font-serif';
      case 'minimalist':
      default:
        return 'font-sans';
    }
  };

  const hasHeaderContent =
    displayTitle ||
    metadata.subtitle ||
    metadata.author ||
    metadata.affiliation ||
    metadata.date ||
    metadata.journal;

  return (
    <div className={`w-full h-full overflow-y-auto ${modeStyles.outerBg} p-2 sm:p-6 flex flex-col items-center transition-colors duration-300`}>
      {/* Floating Reading Mode Toolbar */}
      <div className="no-print mb-4 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 flex items-center gap-1 text-xs text-slate-300 shadow-lg z-10">
        <span className="px-2 font-medium text-slate-400 border-l border-slate-800 text-[11px]">
          حالت مطالعه:
        </span>
        <button
          onClick={() => handleModeChange('day')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition-all font-medium ${
            modeToUse === 'day'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'hover:bg-slate-800 text-slate-300'
          }`}
          title="حالت روز (روشن)"
        >
          <Sun className="w-3.5 h-3.5" />
          <span>روز</span>
        </button>
        <button
          onClick={() => handleModeChange('night')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition-all font-medium ${
            modeToUse === 'night'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'hover:bg-slate-800 text-slate-300'
          }`}
          title="حالت شب (تاریک)"
        >
          <Moon className="w-3.5 h-3.5" />
          <span>شب</span>
        </button>
        <button
          onClick={() => handleModeChange('reading')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition-all font-medium ${
            modeToUse === 'reading'
              ? 'bg-amber-800 text-amber-100 shadow-xs'
              : 'hover:bg-slate-800 text-slate-300'
          }`}
          title="حالت مطالعه (پاپیروس/سپیا)"
        >
          <Book className="w-3.5 h-3.5" />
          <span>مطالعه</span>
        </button>
        <button
          onClick={() => handleModeChange('auto')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition-all font-medium ${
            modeToUse === 'auto'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'hover:bg-slate-800 text-slate-300'
          }`}
          title="حالت خودکار بر اساس ساعت و سیستم"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>خودکار ({activeMode === 'night' ? 'شب' : 'روز'})</span>
        </button>

        <div className="w-px h-4 bg-slate-800 mx-1" />

        <button
          onClick={() => typeof window !== 'undefined' && window.print()}
          className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-medium shadow-xs"
          title="چاپ مقاله یا ذخیره به عنوان PDF در مرورگر"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>چاپ / PDF</span>
        </button>
      </div>

      {/* Article Sheet Frame */}
      <article
        id="article-pdf-content"
        dir={dir}
        data-active-mode={activeMode}
        style={{
          fontSize: `${metadata.fontSize || 16}px`,
          lineHeight: metadata.lineHeight || 1.8,
        }}
        className={`article-container w-full max-w-4xl min-h-[700px] p-6 sm:p-12 rounded-2xl transition-all duration-300 border ${modeStyles.sheet} ${getLayoutBorderClass()}`}
      >
        {/* Article Metadata Header */}
        {metadata.showMetadata && hasHeaderContent && (
          <header className="mb-8 pb-6 border-b-2 border-slate-300/40">
            {displayTitle && (
              <h1 className={`text-2xl sm:text-4xl font-extrabold leading-tight mb-3 ${modeStyles.headerText}`}>
                {displayTitle}
              </h1>
            )}

            {metadata.subtitle && (
              <p className={`text-base sm:text-lg font-normal leading-relaxed mb-6 ${modeStyles.subtitleText}`}>
                {metadata.subtitle}
              </p>
            )}

            <div className={`flex flex-wrap items-center gap-x-6 gap-y-2 text-xs p-3 sm:p-4 rounded-xl border ${modeStyles.metaBg}`}>
              {metadata.author && (
                <div className="flex items-center gap-1.5 font-medium">
                  <User className="w-4 h-4 text-indigo-500" />
                  <span>نویسنده:</span>
                  <strong>{metadata.author}</strong>
                </div>
              )}
              {metadata.affiliation && (
                <div className="flex items-center gap-1.5 opacity-90">
                  <Building className="w-4 h-4" />
                  <span>{metadata.affiliation}</span>
                </div>
              )}
              {metadata.date && (
                <div className="flex items-center gap-1.5 opacity-90">
                  <Calendar className="w-4 h-4" />
                  <span>{metadata.date}</span>
                </div>
              )}
              {metadata.journal && (
                <div className="flex items-center gap-1.5 opacity-90">
                  <Bookmark className="w-4 h-4" />
                  <span>{metadata.journal}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 font-medium mr-auto text-indigo-500">
                <Clock className="w-4 h-4" />
                <span>{readTime} دقیقه مطالعـه ({wordCount} کلمه)</span>
              </div>
            </div>
          </header>
        )}

        {/* Abstract Section */}
        {metadata.abstract && (
          <section className={`border-r-4 rounded-xl p-5 mb-8 shadow-xs ${modeStyles.abstractBg}`}>
            <h2 className="text-sm font-bold mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              <span>چکیده مقاله (Abstract)</span>
            </h2>
            <p className="text-sm leading-relaxed text-justify opacity-90">
              {metadata.abstract}
            </p>
            {metadata.keywords && (
              <div className="mt-3 pt-2 border-t border-slate-300/30 text-xs opacity-75">
                <strong>کلمات کلیدی:</strong> {metadata.keywords}
              </div>
            )}
          </section>
        )}

        {/* Table of Contents */}
        {metadata.showToc && toc.length > 0 && (
          <nav className={`border rounded-2xl p-5 mb-8 no-print shadow-xs ${modeStyles.tocBg}`}>
            <h3 className="text-sm font-bold mb-3 pb-2 border-b border-slate-300/40 flex items-center gap-2">
              <span>📋</span>
              <span>فهرست مطالب مقاله</span>
            </h3>
            <ul className="space-y-1.5 text-xs opacity-90">
              {toc.map((item, index) => (
                <li
                  key={`${item.id}-${index}`}
                  className={`${
                    item.level === 2 ? 'pr-4' : item.level === 3 ? 'pr-8' : ''
                  }`}
                >
                  <a
                    href={`#${item.id}`}
                    className="hover:text-indigo-500 hover:underline transition-colors py-0.5 inline-block"
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* Rendered HTML Body */}
        <main
          className={`article-body text-sm sm:text-base leading-relaxed space-y-4 ${modeStyles.bodyClass}`}
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </article>
    </div>
  );
};
