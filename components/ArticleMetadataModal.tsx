'use client';

import React from 'react';
import { X, Save, AlignRight, AlignLeft, Layout, FileText, Check, Type, Sliders } from 'lucide-react';
import { ArticleMetadata, ArticleTheme } from '@/lib/markdown-converter';

interface MetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: ArticleMetadata;
  setMetadata: React.Dispatch<React.SetStateAction<ArticleMetadata>>;
}

export const ArticleMetadataModal: React.FC<MetadataModalProps> = ({
  isOpen,
  onClose,
  metadata,
  setMetadata,
}) => {
  if (!isOpen) return null;

  const handleChange = (field: keyof ArticleMetadata, value: any) => {
    setMetadata((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">تنظیمات و اطلاعات شناسه مقاله</h2>
              <p className="text-xs text-slate-400">مشخصات هدر، نویسنده، چکیده و متاداده‌های خروجی</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Main Title & Subtitle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">عنوان اصلی مقاله (Title)</label>
              <input
                type="text"
                value={metadata.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="عنوان مقاله اصلی را وارد کنید..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">زیرعنوان / سوتیتر (Subtitle)</label>
              <input
                type="text"
                value={metadata.subtitle}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                placeholder="زیرعنوان مقاله..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Author & Affiliation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">نام نویسنده (Author)</label>
              <input
                type="text"
                value={metadata.author}
                onChange={(e) => handleChange('author', e.target.value)}
                placeholder="نام و نام خانوادگی نویسنده..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">سازمان / دانشگاه (Affiliation)</label>
              <input
                type="text"
                value={metadata.affiliation}
                onChange={(e) => handleChange('affiliation', e.target.value)}
                placeholder="نام سازمان، شرکت یا دانشگاه..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Date & Journal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">تاریخ انتشار (Date)</label>
              <input
                type="text"
                value={metadata.date}
                onChange={(e) => handleChange('date', e.target.value)}
                placeholder="تاریخ نگارش یا انتشار..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">نام مجله / نشریه (Journal/Publisher)</label>
              <input
                type="text"
                value={metadata.journal}
                onChange={(e) => handleChange('journal', e.target.value)}
                placeholder="نام مجله، نشریه یا وب‌سایت..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Abstract */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">چکیده مقاله (Abstract)</label>
            <textarea
              rows={3}
              value={metadata.abstract}
              onChange={(e) => handleChange('abstract', e.target.value)}
              placeholder="متن چکیده یا خلاصه‌ای از مقاله..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">کلمات کلیدی (Keywords)</label>
            <input
              type="text"
              value={metadata.keywords}
              onChange={(e) => handleChange('keywords', e.target.value)}
              placeholder="کلمات کلیدی مقاله (با کاما جدا کنید)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Typography Sliders (Font Size & Line Height) */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-xs">
              <Sliders className="w-4 h-4" />
              <span>تنظیم تایپوگرافی و خوانایی (Typography & Spacing)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              {/* Font Size Slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-medium flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-indigo-400" />
                    <span>اندازه قلم متن (Font Size)</span>
                  </label>
                  <span className="text-indigo-400 font-mono font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {metadata.fontSize || 16}px
                  </span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={26}
                  step={1}
                  value={metadata.fontSize || 16}
                  onChange={(e) => handleChange('fontSize', Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                  <span>12px</span>
                  <span>16px (استاندارد)</span>
                  <span>26px</span>
                </div>
              </div>

              {/* Line Height Slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-medium flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    <span>فاصله خطوط (Line Height)</span>
                  </label>
                  <span className="text-indigo-400 font-mono font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {metadata.lineHeight || 1.8}
                  </span>
                </div>
                <input
                  type="range"
                  min={1.2}
                  max={2.8}
                  step={0.1}
                  value={metadata.lineHeight || 1.8}
                  onChange={(e) => handleChange('lineHeight', Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                  <span>1.2 (فشرده)</span>
                  <span>1.8 (استاندارد)</span>
                  <span>2.8 (باز)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Direction & Display Toggles */}
          <div className="pt-2 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">جهت چینش متن</label>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => handleChange('direction', 'rtl')}
                  className={`flex-1 py-1 rounded-lg text-center transition-colors ${
                    metadata.direction === 'rtl' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                  }`}
                >
                  راست‌چین (RTL)
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('direction', 'ltr')}
                  className={`flex-1 py-1 rounded-lg text-center transition-colors ${
                    metadata.direction === 'ltr' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                  }`}
                >
                  چپ‌چین (LTR)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="showMetadata"
                checked={metadata.showMetadata}
                onChange={(e) => handleChange('showMetadata', e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="showMetadata" className="text-slate-300 cursor-pointer">
                نمایش هدر مشخصات در بالای مقاله
              </label>
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="showToc"
                checked={metadata.showToc}
                onChange={(e) => handleChange('showToc', e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="showToc" className="text-slate-300 cursor-pointer">
                نمایش فهرست مطالب (TOC) اتوماتیک
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-800/80 border-t border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-600/20"
          >
            <Check className="w-4 h-4" />
            <span>تایید و اعمال</span>
          </button>
        </div>
      </div>
    </div>
  );
};
