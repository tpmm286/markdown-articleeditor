'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Code,
  Type,
  Check,
  AlertCircle,
  Copy,
  Info,
  Hash,
} from 'lucide-react';
import { ArticleMetadata } from '@/lib/markdown-converter';

interface SnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
  snippets: { name: string; content: string }[];
  onUpdateSnippets: (snippets: { name: string; content: string }[]) => void;
}

export const SnippetModal: React.FC<SnippetModalProps> = ({
  isOpen,
  onClose,
  snippets = [],
  onUpdateSnippets,
}) => {
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddSnippet = () => {
    setError(null);
    const cleanName = newName.trim();
    const cleanContent = newContent.trim();

    if (!cleanName) {
      setError('لطفاً نام اسنیپت را وارد کنید.');
      return;
    }

    if (!cleanContent) {
      setError('لطفاً محتوای اسنیپت را وارد کنید.');
      return;
    }

    if (snippets.some((s) => s.name.toLowerCase() === cleanName.toLowerCase())) {
      setError('این نام قبلاً استفاده شده است.');
      return;
    }

    // Basic name validation (no spaces or special chars for easier use in {{name}})
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanName)) {
      setError('نام اسنیپت فقط می‌تواند شامل حروف انگلیسی، اعداد، خط تیره و زیرخط باشد.');
      return;
    }

    onUpdateSnippets([...snippets, { name: cleanName, content: cleanContent }]);
    setNewName('');
    setNewContent('');
  };

  const handleRemoveSnippet = (name: string) => {
    onUpdateSnippets(snippets.filter((s) => s.name !== name));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">مدیریت اسنیپت‌های سفارشی (Snippets)</h2>
              <p className="text-[11px] text-slate-400">تعریف متون یا کدهای HTML تکرار شونده برای استفاده در مقاله</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Instructions */}
          <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-4 text-xs leading-relaxed text-indigo-200">
            <div className="flex items-center gap-2 mb-2 font-bold text-indigo-300">
              <Info className="w-4 h-4" />
              <span>راهنمای استفاده:</span>
            </div>
            <p>
              با استفاده از اسنیپت‌ها می‌توانید کدهای HTML سفارشی (مثل باکس‌های امضا، جداول خاص، یا المان‌های تکراری) را تعریف کنید.
              برای استفاده در متن مقاله، نام اسنیپت را داخل دو آکولاد قرار دهید: 
              <code className="mx-1.5 px-2 py-0.5 bg-slate-950 rounded border border-indigo-500/30 text-indigo-400 font-mono">{'{{نام_اسنیپت}}'}</code>
            </p>
          </div>

          {/* New Snippet Form */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>تعریف اسنیپت جدید</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1.5 font-medium">نام اسنیپت (Placeholder Name)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 font-mono">{'{{'}</span>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="my_button"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-8 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 font-mono">{'}}'}</span>
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAddSnippet}
                  className="w-full h-[38px] bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن به لیست</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-[11px] mb-1.5 font-medium">محتوای متنی یا کد HTML</label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="<div class='my-custom-box'>محتوا...</div>"
                rows={3}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-xs"
              />
            </div>

            {error && (
              <div className="p-2.5 bg-rose-950/30 border border-rose-500/30 rounded-xl text-rose-300 flex items-center gap-2 text-[11px]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* List of Existing Snippets */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2 px-1">
              <Hash className="w-4 h-4 text-purple-400" />
              <span>لیست اسنیپت‌های فعال ({snippets.length})</span>
            </h3>

            {snippets.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl">
                <div className="w-12 h-12 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-500">
                  <Code className="w-6 h-6" />
                </div>
                <p className="text-slate-500 text-xs">هنوز اسنیپتی تعریف نشده است.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {snippets.map((snippet) => (
                  <div
                    key={snippet.name}
                    className="group bg-slate-950/40 border border-slate-800 hover:border-slate-700 rounded-xl p-3 flex items-start justify-between gap-4 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-mono text-xs text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          {'{{'}{snippet.name}{'}}'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono line-clamp-2 break-all bg-slate-900/50 p-2 rounded-lg">
                        {snippet.content}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          const tag = `{{${snippet.name}}}`;
                          navigator.clipboard.writeText(tag);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                        title="کپی تگ"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveSnippet(snippet.name)}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-800/80 border-t border-slate-800 flex justify-between items-center shrink-0">
          <p className="text-[10px] text-slate-500">
             تمامی اسنیپت‌ها همراه پروژه (فایل .mdpress) ذخیره می‌شوند.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow-md shadow-indigo-600/20 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>اتمام مدیریت</span>
          </button>
        </div>
      </div>
    </div>
  );
};
