'use client';

import React from 'react';
import { Copy, Check, Code, Zap, FileCode, Cpu, Download, Archive } from 'lucide-react';
import { ArticleMetadata, generateStandaloneArticleHtml, convertMarkdownToArticleHtml } from '@/lib/markdown-converter';

interface HtmlCodeViewProps {
  markdown: string;
  metadata: ArticleMetadata;
  onDownloadHtml?: () => void;
  onDownloadZip?: () => void;
}

export const HtmlCodeView: React.FC<HtmlCodeViewProps> = ({
  markdown,
  metadata,
  onDownloadHtml,
  onDownloadZip,
}) => {
  const [mode, setMode] = React.useState<'standalone' | 'body'>('standalone');
  const [isCompressed, setIsCompressed] = React.useState(true);
  const [useLzString, setUseLzString] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const fullHtml = React.useMemo(() => {
    try {
      return generateStandaloneArticleHtml(markdown, metadata, {
        minify: isCompressed,
        compressLz: useLzString,
      });
    } catch (e) {
      console.error('HTML generation error:', e);
      return '<!-- Error generating HTML -->';
    }
  }, [markdown, metadata, isCompressed, useLzString]);

  const bodyOnlyHtml = React.useMemo(() => {
    try {
      return convertMarkdownToArticleHtml(markdown, metadata).bodyHtml;
    } catch (e) {
      console.error('Body HTML generation error:', e);
      return '';
    }
  }, [markdown, metadata]);

  const codeToDisplay = mode === 'standalone' ? fullHtml : bodyOnlyHtml;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeToDisplay);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
      {/* Code Viewer Header */}
      <div className="bg-slate-800/90 border-b border-slate-800 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-sky-400" />
          <span className="font-bold text-slate-200">کد HTML خروجی مقاله</span>
        </div>

        {/* Format Selector & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center text-xs">
            <button
              onClick={() => setMode('standalone')}
              className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                mode === 'standalone'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              صفحه HTML کامل (Standalone)
            </button>
            <button
              onClick={() => setMode('body')}
              className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                mode === 'body'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              فقط بدنه (Body Only)
            </button>
          </div>

          {mode === 'standalone' && (
            <>
              <button
                onClick={() => setIsCompressed(!isCompressed)}
                className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1 font-medium transition-all ${
                  isCompressed
                    ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title="فشرده‌سازی و Minify کدهای HTML و CSS"
              >
                <Zap className={`w-3.5 h-3.5 ${isCompressed ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{isCompressed ? 'Minify فعال' : 'Minify خاموش'}</span>
              </button>

              <button
                onClick={() => setUseLzString(!useLzString)}
                className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1 font-medium transition-all ${
                  useLzString
                    ? 'bg-purple-950/70 border-purple-500/50 text-purple-300'
                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title="فشرده‌سازی عمیق با الگوریتم LZ-String (کاهش چشم‌گیر حجم مقالات بسیار طولانی)"
              >
                <Cpu className={`w-3.5 h-3.5 ${useLzString ? 'text-purple-400' : 'text-slate-400'}`} />
                <span>{useLzString ? 'فشرده‌سازی LZ-String فعال' : 'LZ-String'}</span>
              </button>
            </>
          )}

          <button
            onClick={handleCopy}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors shadow-xs"
            title="کپی کردن کد در کلیپ‌بورد"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'کپی شد!' : 'کپی کد'}</span>
          </button>

          {onDownloadHtml && (
            <button
              onClick={onDownloadHtml}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors shadow-xs"
              title="دانلود فایل HTML مستقل"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>دانلود HTML</span>
            </button>
          )}

          {onDownloadZip && (
            <button
              onClick={onDownloadZip}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
              title="دانلود بسته ZIP فشرده همراه با تمام صوت‌ها و عکس‌ها"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>دانلود پکیج ZIP</span>
            </button>
          )}
        </div>
      </div>

      {/* Code Textarea */}
      <div className="relative flex-1 bg-slate-950 p-4 font-mono text-xs overflow-auto text-slate-300 leading-relaxed dir-ltr text-left">
        <pre className="whitespace-pre-wrap break-all">
          <code>{codeToDisplay}</code>
        </pre>
      </div>

      {/* Footer Info */}
      <div className="bg-slate-950 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            تعداد کاراکترها: <strong>{codeToDisplay.length.toLocaleString('fa-IR')}</strong> &bull; حجم خروجی:{' '}
            <strong className="text-emerald-400">{(codeToDisplay.length / 1024).toFixed(1)} KB</strong>
          </div>
          {isCompressed && mode === 'standalone' && (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
              ⚡ بهینه‌شده
            </span>
          )}
          {useLzString && mode === 'standalone' && (
            <span className="text-[10px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20">
              📦 فشرده‌سازی عمیق LZ-String (کاهش فوق‌العاده حجم)
            </span>
          )}
        </div>
        <div className="text-slate-400 hidden sm:block">
          آماده جهت استفاده مستقل و بارگذاری سریع در انواع مرورگرها و سامانه‌ها
        </div>
      </div>
    </div>
  );
};
