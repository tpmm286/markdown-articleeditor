'use client';

import React from 'react';
import {
  FileText,
  Download,
  Copy,
  Printer,
  Code,
  Eye,
  Settings,
  Upload,
  LayoutTemplate,
  Check,
  Maximize2,
  Minimize2,
  Focus,
  FileDown,
  Loader2,
} from 'lucide-react';
import { ArticleTheme } from '@/lib/markdown-converter';

interface HeaderProps {
  activeView: 'preview' | 'html' | 'split';
  setActiveView: (view: 'preview' | 'html' | 'split') => void;
  selectedTheme: ArticleTheme;
  setSelectedTheme: (theme: ArticleTheme) => void;
  onOpenMetadata: () => void;
  onCopyHtml: (standalone: boolean) => void;
  onDownloadHtml: () => void;
  onPrintPdf: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  copiedState: boolean;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  selectedTheme,
  setSelectedTheme,
  onOpenMetadata,
  onCopyHtml,
  onDownloadHtml,
  onPrintPdf,
  onFileUpload,
  copiedState,
  isFocusMode,
  onToggleFocusMode,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <header className="no-print bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 py-3 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-extrabold text-white flex items-center gap-2">
                مبدل Markdown به مقاله HTML
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-sans">
                  نسخه مقاله
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                تبدیل متون مارک‌داون به مقالات استاندارد و قابل چاپ HTML
              </p>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileUpload}
            accept=".md,.txt,.markdown"
            className="hidden"
          />

          {/* Quick Upload Button Mobile */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="md:hidden text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-lg border border-slate-700 flex items-center gap-1"
            title="آپلود فایل مارک‌داون"
          >
            <Upload className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls & Toolbar */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Focus Mode Toggle Button */}
          <button
            onClick={onToggleFocusMode}
            className={`text-xs px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 font-medium ${
              isFocusMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm ring-1 ring-amber-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="حالت تمرکز برای نوشتن بدون حواس‌پرتی"
          >
            {isFocusMode ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                <span>خروج از تمرکز</span>
              </>
            ) : (
              <>
                <Focus className="w-3.5 h-3.5 text-amber-400" />
                <span>حالت تمرکز</span>
              </>
            )}
          </button>

          {/* View Toggles */}
          {!isFocusMode && (
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center text-xs">
              <button
                onClick={() => setActiveView('split')}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-medium ${
                  activeView === 'split'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutTemplate className="w-3.5 h-3.5" />
                <span>دوپنجره‌ای</span>
              </button>
              <button
                onClick={() => setActiveView('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-medium ${
                  activeView === 'preview'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>پیش‌نمایش مقاله</span>
              </button>
              <button
                onClick={() => setActiveView('html')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-medium ${
                  activeView === 'html'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>کد HTML</span>
              </button>
            </div>
          )}

          {/* Theme Selector */}
          <select
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value as ArticleTheme)}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="academic">قالب علمی (Academic)</option>
            <option value="journalistic">قالب مطبوعاتی (Editorial)</option>
            <option value="minimalist">قالب مدیوم (Minimal)</option>
            <option value="technical">قالب فنی (Technical)</option>
            <option value="classic">قالب کلاسیک (Classic)</option>
          </select>

          {/* Upload Button Desktop */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="hidden md:flex text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-700 items-center gap-1.5 transition-colors"
            title="آپلود فایل مارک‌داون"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>آپلود MD</span>
          </button>

          {/* Article Settings Button */}
          <button
            onClick={onOpenMetadata}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
            title="مشخصات مقاله (عنوان، نویسنده، چکیده)"
          >
            <Settings className="w-3.5 h-3.5 text-indigo-400" />
            <span>اطلاعات مقاله</span>
          </button>

          {/* Export & Copy Dropdown / Buttons */}
          <div className="flex items-center gap-1.5 border-r border-slate-800 pr-2">
            <button
              onClick={() => onCopyHtml(true)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
              title="کپی کد HTML کامل مقاله"
            >
              {copiedState ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span>{copiedState ? 'کپی شد!' : 'کپی HTML'}</span>
            </button>

            <button
              onClick={onDownloadHtml}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
              title="دانلود فایل HTML کامل مقاله"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">دانلود HTML</span>
            </button>

            <button
              onClick={onPrintPdf}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3.5 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              title="چاپ یا ذخیره مقاله به عنوان فایل PDF از طریق مرورگر"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>چاپ / ذخیره به عنوان PDF</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
