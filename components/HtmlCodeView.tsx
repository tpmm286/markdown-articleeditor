'use client';

import React from 'react';
import { Copy, Check, Code, FileCode, ExternalLink } from 'lucide-react';
import { ArticleMetadata, generateStandaloneArticleHtml, convertMarkdownToArticleHtml } from '@/lib/markdown-converter';

interface HtmlCodeViewProps {
  markdown: string;
  metadata: ArticleMetadata;
}

export const HtmlCodeView: React.FC<HtmlCodeViewProps> = ({ markdown, metadata }) => {
  const [mode, setMode] = React.useState<'standalone' | 'body'>('standalone');
  const [copied, setCopied] = React.useState(false);

  const fullHtml = React.useMemo(() => {
    return generateStandaloneArticleHtml(markdown, metadata);
  }, [markdown, metadata]);

  const bodyOnlyHtml = React.useMemo(() => {
    return convertMarkdownToArticleHtml(markdown, metadata).bodyHtml;
  }, [markdown, metadata]);

  const codeToDisplay = mode === 'standalone' ? fullHtml : bodyOnlyHtml;

  const handleCopy = () => {
    navigator.clipboard.writeText(codeToDisplay);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
      {/* Code Viewer Header */}
      <div className="bg-slate-800/90 border-b border-slate-800 p-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-sky-400" />
          <span className="font-bold text-slate-200">کد HTML خروجی مقاله</span>
        </div>

        {/* Format Selector & Actions */}
        <div className="flex items-center gap-2">
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

          <button
            onClick={handleCopy}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'کپی شد!' : 'کپی کد'}</span>
          </button>
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
        <div>
          تعداد کاراکترها: <strong>{codeToDisplay.length}</strong> &bull; حجم تقریبی:{' '}
          <strong>{(codeToDisplay.length / 1024).toFixed(1)} KB</strong>
        </div>
        <div className="text-slate-400">
          آماده جهت درج در وب‌سایت‌ها، سیستم‌های CMS و نشریات الکترونیکی
        </div>
      </div>
    </div>
  );
};
