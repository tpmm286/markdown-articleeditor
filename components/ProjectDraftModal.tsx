'use client';

import React, { useState, useRef } from 'react';
import {
  Save,
  FolderOpen,
  X,
  Upload,
  Download,
  FileCheck,
  HardDrive,
  Clock,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
  Volume2,
} from 'lucide-react';
import { ArticleMetadata } from '@/lib/markdown-converter';
import { assetStore } from '@/lib/asset-store';
import { exportProjectDraft, importProjectDraft } from '@/lib/project-manager';
import { safeDownloadBlob } from '@/lib/article-packager';

interface ProjectDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  markdown: string;
  metadata: ArticleMetadata;
  onRestoreProject: (markdown: string, metadata: ArticleMetadata, assetCount: number) => void;
}

export const ProjectDraftModal: React.FC<ProjectDraftModalProps> = ({
  isOpen,
  onClose,
  markdown,
  metadata,
  onRestoreProject,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Active assets statistics
  const activeAssets = assetStore.getActiveAssets(markdown, metadata.coverImage);
  const imageAssets = activeAssets.filter((a) => a.type === 'image');
  const audioAssets = activeAssets.filter((a) => a.type === 'audio');

  // Handle Exporting the Project File
  const handleExport = async () => {
    try {
      setIsExporting(true);
      const result = await exportProjectDraft(markdown, metadata);
      safeDownloadBlob(result.blob, result.fileName);
      setImportStatus(`فایل پروژه با موفقیت ذخیره شد (${result.assetCount} رسانه فعال همراه پروژه ذخیره گردید).`);
      setTimeout(() => setImportStatus(null), 4000);
    } catch (err: any) {
      setImportError(err?.message || 'خطا در ذخیره فایل پروژه');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Importing a Project File
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);
    setImportStatus('در حال بارگذاری متن مقاله، تنظیمات و بازگردانی فایل‌های صوتی و تصویری...');

    try {
      const result = await importProjectDraft(file);
      onRestoreProject(result.markdown, result.metadata, result.assetCount);
      setImportStatus(
        `پروژه با موفقیت بازیابی شد! متن مقاله، تنظیمات و ${result.assetCount} فایل رسانه‌ای آماده ادامه کار هستند.`
      );
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setImportError(err?.message || 'خطا در خواندن فایل پروژه. لطفاً از صحت فایل اطمینان حاصل کنید.');
      setImportStatus(null);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl text-slate-100 my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900/90 border-b border-slate-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">مدیریت و ذخیره موقت پروژه</h3>
              <p className="text-[11px] text-slate-400">ذخیره کامل مقاله همراه با صوت و تصویر برای ادامه کار در آینده</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-1 gap-1">
          <button
            onClick={() => {
              setActiveTab('export');
              setImportError(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'export'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>خروجی و ذخیره پروژه (Export)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('import');
              setImportError(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'import'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>ورود و بازیابی پروژه (Import)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs sm:text-sm">
          {activeTab === 'export' ? (
            /* EXPORT TAB */
            <div className="space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="font-semibold text-slate-200">وضعیت محتوای فعلی:</span>
                  <span className="text-[11px] text-indigo-400 font-mono">
                    {metadata.title ? `«${metadata.title.slice(0, 30)}...»` : 'پیش‌نویس بدون عنوان'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                    <ImageIcon className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div>
                      <p className="text-slate-400 text-[11px]">تصاویر مقاله:</p>
                      <p className="font-bold text-white">{imageAssets.length} فایل فعال</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                    <Volume2 className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <p className="text-slate-400 text-[11px]">صوت و پادکست:</p>
                      <p className="font-bold text-white">{audioAssets.length} فایل فعال</p>
                    </div>
                  </div>
                </div>

                <p className="text-slate-400 text-[11px] leading-relaxed pt-1">
                  💡 فایل خروجی پروژه (<span className="text-indigo-300 font-mono">.mdpress</span>) شامل کل متن
                  مارک‌داون، اطلاعات نویسنده، ساختار مقاله و داده‌های باینری تصاویر و پادکست‌های فعال است تا بعداً در هر
                  سیستمی بتوانید کار خود را با تمام فایل‌های صوتی ادامه دهید.
                </p>
              </div>

              {importStatus && (
                <div className="p-3 bg-emerald-950/50 border border-emerald-500/50 rounded-xl text-emerald-300 flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{importStatus}</span>
                </div>
              )}

              {importError && (
                <div className="p-3 bg-rose-950/50 border border-rose-500/50 rounded-xl text-rose-300 flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال بسته‌بندی پروژه...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>دانلود فایل پروژه (.mdpress)</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* IMPORT TAB */
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".mdpress,.json,.zip"
                className="hidden"
                id="project-draft-file-input"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl p-7 text-center transition-colors bg-slate-950/40 cursor-pointer flex flex-col items-center gap-2.5"
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">برای انتخاب فایل پروژه کلیک کنید</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    پشتیبانی از فرمت‌های <span className="text-purple-300 font-mono">.mdpress</span> ،{' '}
                    <span className="text-purple-300 font-mono">.json</span> یا بسته‌های زیپ <span className="text-purple-300 font-mono">.zip</span>
                  </p>
                </div>
                <span className="text-[10px] text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                  متن، اطلاعات و کلیه فایل‌های رسانه‌ای بازیابی خواهند شد
                </span>
              </div>

              {isImporting && (
                <div className="p-3 bg-purple-950/50 border border-purple-500/50 rounded-xl text-purple-200 flex items-center gap-2.5 text-xs">
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
                  <span>در حال خواندن و استخراج محتوا و فایل‌های صوتی/تصویری...</span>
                </div>
              )}

              {importStatus && !isImporting && (
                <div className="p-3 bg-emerald-950/50 border border-emerald-500/50 rounded-xl text-emerald-300 flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{importStatus}</span>
                </div>
              )}

              {importError && (
                <div className="p-3 bg-rose-950/50 border border-rose-500/50 rounded-xl text-rose-300 flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-900/90 border-t border-slate-800 p-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white text-xs font-medium rounded-xl transition-colors"
          >
            بستن
          </button>
          <span className="text-[11px] text-slate-500">
            ذخیره ایمن و محلی بدون نیاز به اشتراک یا دیتابیس خارجی
          </span>
        </div>
      </div>
    </div>
  );
};
