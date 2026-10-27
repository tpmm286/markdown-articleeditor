'use client';

import React, { useState } from 'react';
import {
  Github,
  X,
  Smartphone,
  Monitor,
  Globe,
  Terminal,
  Check,
  Copy,
  Zap,
  HelpCircle,
  Download,
  FileCode2,
} from 'lucide-react';

interface GitHubBuildModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubBuildModal: React.FC<GitHubBuildModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const gitCommands = [
    'git init',
    'git add .',
    'git commit -m "Initial commit for Markdown Article Editor"',
    'git branch -M main',
    'git remote add origin https://github.com/USERNAME/REPOSITORY.git',
    'git push -u origin main',
  ];

  const handleCopyCommand = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAllCommands = () => {
    const all = gitCommands.join('\n');
    navigator.clipboard.writeText(all);
    setCopiedIndex(99);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl text-slate-100 my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-slate-900/90 border-b border-slate-800 p-5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                استقرار در GitHub Pages و ساخت نسخه Android (APK) و Windows (EXE)
              </h2>
              <p className="text-xs text-slate-400">
                راهنمای کامل بیلد خودکار بدون نیاز به سیستم و مناسب برای گوشی موبایل
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto font-sans text-sm">
          {/* Status Badge */}
          <div className="p-4 bg-indigo-950/40 border border-indigo-800/50 rounded-xl flex items-start gap-3 text-indigo-200">
            <Zap className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs md:text-sm">
              <p className="font-semibold text-white">فایل‌های GitHub Actions آماده شده‌اند!</p>
              <p className="text-indigo-300/90 leading-relaxed">
                تنظیمات خودکار در مسیر <code className="bg-indigo-900/60 px-1.5 py-0.5 rounded text-indigo-200">.github/workflows/</code> قرار گرفتند. به‌محض push کردن پروژه به گیت‌هاب، سیستم خودکار گیت‌هاب سایت وب، فایل اندروید <code className="text-amber-300 font-mono">.apk</code> و نسخه ویندوز <code className="text-amber-300 font-mono">.exe</code> را می‌سازد.
              </p>
            </div>
          </div>

          {/* Supported Outputs Grid */}
          <div>
            <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-purple-400" />
              خروجی‌های آماده‌شده در مخزن گیت‌هاب شما:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Globe className="w-4 h-4" />
                  <span>GitHub Pages (وب‌سایت)</span>
                </div>
                <p className="text-xs text-slate-300 leading-normal">
                  سایت کاملاً آنلاین با لینک شخصی <code className="text-emerald-300 font-mono">username.github.io/repo</code> به صورت رایگان.
                </p>
              </div>

              <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <Smartphone className="w-4 h-4" />
                  <span>نسخه اندروید (APK)</span>
                </div>
                <p className="text-xs text-slate-300 leading-normal">
                  ساخت فایل <code className="text-amber-300 font-mono">.apk</code> توسط GitHub Actions و قابل دانلود مستقیم در تب Actions یا Releases.
                </p>
              </div>

              <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                  <Monitor className="w-4 h-4" />
                  <span>نسخه ویندوز (EXE)</span>
                </div>
                <p className="text-xs text-slate-300 leading-normal">
                  خروجی نرم‌افزار دسکتاپ ویندوز بدون نیاز به نصب نرم‌افزار اضافی روی سیستم یا گوشی شما.
                </p>
              </div>
            </div>
          </div>

          {/* Step 1: Push to GitHub */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                دستورات خروجی گرفتن و آپلود در گیت‌هاب
              </h3>
              <button
                onClick={handleCopyAllCommands}
                className="text-xs text-indigo-300 hover:text-white bg-indigo-950/70 border border-indigo-800/60 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5"
              >
                {copiedIndex === 99 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>کپی همه دستورات</span>
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 space-y-2 dir-ltr">
              {gitCommands.map((cmd, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 hover:bg-slate-900/80 p-1.5 rounded transition-colors group">
                  <span className="text-slate-200 select-all">$ {cmd}</span>
                  <button
                    onClick={() => handleCopyCommand(cmd, idx)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white transition-opacity"
                    title="کپی دستور"
                  >
                    {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Step 2: How to Download APK / EXE on Mobile */}
          <div className="space-y-3 bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              نحوه دانلود فایل APK و EXE از گیت‌هاب روی گوشی موبایل:
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 leading-relaxed pr-2">
              <li>وارد حساب گیت‌هاب خود شده و ریپازیتوری ایجاد شده را باز کنید.</li>
              <li>از منوی بالای ریپازیتوری وارد زبانه <strong className="text-white">Actions</strong> شوید.</li>
              <li>روی آخرین اجرای موفق بیلد (<strong className="text-indigo-300">Build Cross-Platform</strong>) کلیک کنید.</li>
              <li>در انتهای صفحه در بخش <strong className="text-white">Artifacts</strong>، فایل‌های <strong className="text-amber-300 font-mono">markdown-article-editor-android-apk</strong> و <strong className="text-sky-300 font-mono">markdown-article-editor-windows-app</strong> جهت دانلود مستقیم با گوشی در دسترس هستند!</li>
            </ol>
          </div>

          {/* Step 3: Enable GitHub Pages */}
          <div className="space-y-2 bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-sky-400" />
              فعال‌سازی GitHub Pages (میزبانی وب رایگان):
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              در ریپازیتوری خود به مسیر <strong className="text-white">Settings &gt; Pages</strong> بروید و گزینه <strong className="text-white">Source</strong> را روی <strong className="text-indigo-300">GitHub Actions</strong> تنظیم کنید. پس از آن با هر push، وب‌سایت شما به صورت خودکار بروزرسانی می‌شود.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-900/90 border-t border-slate-800 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md"
          >
            متوجه شدم، بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
