'use client';

import React from 'react';
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
} from 'lucide-react';
import { SAMPLE_MARKDOWNS } from '@/lib/markdown-converter';

interface MarkdownEditorProps {
  markdown: string;
  setMarkdown: (value: string) => void;
  wordCount: number;
  readTime: number;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  markdown,
  setMarkdown,
  wordCount,
  readTime,
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = React.useState(false);

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
    </div>
  );
};
