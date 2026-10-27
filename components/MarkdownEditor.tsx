'use client';

import React, { useState, useRef } from 'react';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  SquareCode,
  Table,
  Calculator,
  ListOrdered,
  List,
  CheckSquare,
  AlertCircle,
  Trash2,
  Copy,
  Check,
  FileEdit,
  FileText,
  Image as ImageIcon,
  Volume2,
  ChevronDown,
  Puzzle,
} from 'lucide-react';
import { SAMPLE_MARKDOWNS } from '@/lib/markdown-converter';
import { InsertMediaModal } from './InsertMediaModal';

interface MarkdownEditorProps {
  markdown: string;
  setMarkdown: (value: string) => void;
  wordCount: number;
  readTime: number;
  snippets?: { name: string; content: string }[];
  scrollTop?: number;
  onScroll?: (scrollTop: number) => void;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  markdown,
  setMarkdown,
  wordCount,
  readTime,
  snippets = [],
  scrollTop = 0,
  onScroll,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaModalTab, setMediaModalTab] = useState<'image' | 'audio'>('image');
  const [showSnippetList, setShowSnippetList] = useState(false);

  React.useEffect(() => {
    if (textareaRef.current && scrollTop > 0) {
      textareaRef.current.scrollTop = scrollTop;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to insert markdown syntax at cursor position
  const insertSnippet = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = markdown.substring(start, end) || 'متن نمونه';
    const replacement = before + selectedText + after;

    const newMarkdown =
      markdown.substring(0, start) + replacement + markdown.substring(end);
    setMarkdown(newMarkdown);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 50);
  };

  const handleOpenMediaModal = (tab: 'image' | 'audio') => {
    setMediaModalTab(tab);
    setIsMediaModalOpen(true);
  };

  const handleInsertMedia = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setMarkdown(markdown + '\n' + snippet);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newMarkdown =
      markdown.substring(0, start) + snippet + markdown.substring(end);
    setMarkdown(newMarkdown);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + snippet.length,
        start + snippet.length
      );
    }, 50);
  };

  const handleCopyMd = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    if (confirm('آیا از پاک کردن کامل متن ادیتور اطمینان دارید؟')) {
      setMarkdown('');
    }
  };

  const handleInsertSample = () => {
    if (!markdown.trim() || confirm('آیا می‌خواهید متن مقاله نمونه جایگزین شود؟')) {
      setMarkdown(SAMPLE_MARKDOWNS.academic);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
      {/* Editor Header & Toolbar */}
      <div className="bg-slate-800/90 border-b border-slate-800 p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-semibold px-2">
          <FileEdit className="w-4 h-4 text-indigo-400" />
          <span>ویرایشگر Markdown</span>
        </div>

        {/* Action Format Icons */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => insertSnippet('**', '**')}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="درشت (Bold)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSnippet('*', '*')}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="مورب (Italic)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-slate-800 mx-1" />
          <button
            onClick={() => insertSnippet('# ', '')}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="تیتر سطح ۱ (H1)"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSnippet('## ', '')}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="تیتر سطح ۲ (H2)"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSnippet('### ', '')}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="تیتر سطح ۳ (H3)"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-slate-800 mx-1" />
          <button
            onClick={() => insertSnippet('- ', '')}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="لیست بالتدار"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSnippet('1. ', '')}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="لیست شماره‌دار"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSnippet('- [ ] ', '')}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="چک‌باکس"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-slate-800 mx-1" />
          <button
            onClick={() => insertSnippet('> ', '')}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="نقل‌قول (Quote)"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSnippet('```python\n', '\n```')}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="بلوک کد (Code Block)"
          >
            <SquareCode className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() =>
              insertSnippet(
                '\n| ستون ۱ | ستون ۲ |\n| :--- | :---: |\n| داده ۱ | داده ۲ |\n'
              )
            }
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="جدول (Table)"
          >
            <Table className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSnippet('$$ ', ' $$')}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="فرمول ریاضی LaTeX ($$)"
          >
            <Calculator className="w-3.5 h-3.5 text-indigo-400" />
          </button>
          <button
            onClick={() => insertSnippet('\n> [!NOTE]\n> این یک یادداشت مهم است.\n')}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="باکس یادداشت ویژه"
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          </button>

          {/* Snippets Dropdown */}
          {snippets.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowSnippetList(!showSnippetList)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all border ${
                  showSnippetList
                    ? 'bg-purple-900/40 border-purple-500/50 text-purple-200'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="درج اسنیپت‌های سفارشی"
              >
                <Puzzle className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[10px] font-medium">اسنیپت</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showSnippetList ? 'rotate-180' : ''}`} />
              </button>

              {showSnippetList && (
                <div className="absolute top-full left-0 mt-1.5 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="p-1.5 max-h-60 overflow-y-auto">
                    {snippets.map((s) => (
                      <button
                        key={s.name}
                        onClick={() => {
                          insertSnippet(`{{${s.name}}}`, '');
                          setShowSnippetList(false);
                        }}
                        className="w-full text-right px-3 py-2 text-[11px] text-slate-300 hover:text-white hover:bg-indigo-600 rounded-lg transition-colors flex items-center justify-between gap-2"
                      >
                        <span className="truncate flex-1">{s.name}</span>
                        <Copy className="w-3 h-3 opacity-40 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Media insertion buttons: Image & Audio */}
          <div className="w-px h-4 bg-slate-800 mx-1" />
          <button
            onClick={() => handleOpenMediaModal('image')}
            className="flex items-center gap-1 px-2 py-1 bg-indigo-950/70 hover:bg-indigo-900/90 text-indigo-300 hover:text-white border border-indigo-800/60 rounded-lg transition-all"
            title="افزودن تصویر (آپلود یا لینک)"
          >
            <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px] font-medium hidden sm:inline">تصویر</span>
          </button>
          <button
            onClick={() => handleOpenMediaModal('audio')}
            className="flex items-center gap-1 px-2 py-1 bg-purple-950/70 hover:bg-purple-900/90 text-purple-300 hover:text-white border border-purple-800/60 rounded-lg transition-all"
            title="افزودن صوت / پادکست (آپلود یا لینک)"
          >
            <Volume2 className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[11px] font-medium hidden sm:inline">صوت</span>
          </button>
        </div>

        {/* Action buttons: Sample, Copy, Clear */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleInsertSample}
            className="px-2.5 py-1 text-xs text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 hover:bg-indigo-900/80 hover:text-white rounded-lg transition-colors flex items-center gap-1.5 font-medium"
            title="درج مقاله نمونه برای تست"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>متن نمونه</span>
          </button>
          <button
            onClick={handleCopyMd}
            className="px-2.5 py-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 font-medium"
            title="کپی مارک‌داون"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'کپی شد' : 'کپی'}</span>
          </button>
          <button
            onClick={handleClear}
            className="px-2.5 py-1 text-xs text-rose-300 bg-rose-950/40 border border-rose-900/40 hover:bg-rose-900/60 hover:text-rose-200 rounded-lg transition-colors flex items-center gap-1.5 font-medium"
            title="پاک کردن کامل متن ادیتور"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>پاک کردن</span>
          </button>
        </div>
      </div>

      {/* Main Textarea */}
      <div className="relative flex-1 min-h-[420px]">
        <textarea
          ref={textareaRef}
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          onScroll={(e) => onScroll?.(e.currentTarget.scrollTop)}
          placeholder="متن مارک‌داون مقاله خود را اینجا وارد کنید یا فایل .md را در این صفحه رها سازید..."
          className="w-full h-full bg-slate-950 text-slate-100 p-4 font-mono text-sm leading-relaxed focus:outline-none resize-none border-0"
          dir="auto"
        />
      </div>

      {/* Footer Status Bar */}
      <div className="bg-slate-950 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-3">
          <span>کلمات: <strong>{wordCount}</strong></span>
          <span>کاراکترها: <strong>{markdown.length}</strong></span>
          <span>زمان مطالعه: <strong>حدود {readTime} دقیقه</strong></span>
        </div>
        <div className="flex items-center gap-1 text-indigo-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>پیش‌نمایش زنده فعال است</span>
        </div>
      </div>

      {/* Media Insertion Modal */}
      <InsertMediaModal
        isOpen={isMediaModalOpen}
        initialTab={mediaModalTab}
        onClose={() => setIsMediaModalOpen(false)}
        onInsert={handleInsertMedia}
      />
    </div>
  );
};

