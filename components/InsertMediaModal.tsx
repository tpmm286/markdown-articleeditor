'use client';

import React, { useState } from 'react';
import {
  X,
  Image as ImageIcon,
  Volume2,
  Upload,
  Link,
  Sparkles,
  Play,
  Check,
  Loader2,
  FileCheck,
} from 'lucide-react';
import { assetStore, optimizeImageFile } from '@/lib/asset-store';

interface InsertMediaModalProps {
  isOpen: boolean;
  initialTab?: 'image' | 'audio';
  onClose: () => void;
  onInsert: (markdownSnippet: string) => void;
}

const PRESET_IMAGES = [
  {
    title: 'هوش مصنوعی و پردازش داده',
    url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=900&auto=format&fit=crop&q=80',
    alt: 'تصویر هوش مصنوعی و شبکه عصبی',
  },
  {
    title: 'تکنولوژی و برنامه‌نویسی',
    url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=900&auto=format&fit=crop&q=80',
    alt: 'کدنویسی و توسعه نرم‌افزار',
  },
  {
    title: 'علمی و پژوهشی دانشگاهی',
    url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=900&auto=format&fit=crop&q=80',
    alt: 'آزمایشگاه و پژوهش علمی',
  },
  {
    title: 'طبیعت و محیط‌زیست',
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=900&auto=format&fit=crop&q=80',
    alt: 'چشم‌انداز کوهستان و طبیعت',
  },
];

const PRESET_AUDIOS = [
  {
    title: 'موسیقی بی‌کلام آرامش‌بخش مطالعه',
    subtitle: 'آهنگ تمرکز برای خواندن مقاله',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    title: 'پادکست نمونه: مقدمه‌ای بر هوش مصنوعی',
    subtitle: 'روایت صوتی بخش چکیده مقاله',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    title: 'صدای پس‌زمینه طبیعت و باران',
    subtitle: 'محیط صوتی مناسب پژوهش',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
];

export const InsertMediaModal: React.FC<InsertMediaModalProps> = ({
  isOpen,
  initialTab = 'image',
  onClose,
  onInsert,
}) => {
  const [tabOverride, setTabOverride] = useState<'image' | 'audio' | null>(null);
  const activeTab = tabOverride ?? initialTab;

  // Image State
  const [imageSourceMode, setImageSourceMode] = useState<'url' | 'upload' | 'preset'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Audio State
  const [audioSourceMode, setAudioSourceMode] = useState<'url' | 'upload' | 'preset'>('upload');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioTitle, setAudioTitle] = useState('');
  const [audioSubtitle, setAudioSubtitle] = useState('');
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  const [uploadStatusMsg, setUploadStatusMsg] = useState('');

  if (!isOpen) return null;

  // Handle local image file upload (optimized & stored in lightweight asset registry)
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setUploadStatusMsg('در حال بهینه‌سازی و فشرده‌سازی تصویر...');

    try {
      // Optimize image (resize huge resolution to standard web 1600px max)
      const optimizedBlob = await optimizeImageFile(file);
      
      // Register in AssetStore with guaranteed DataURL for 100% standalone offline exports
      const { relativePath, name } = await assetStore.registerBlob(optimizedBlob, file.name, 'image');
      setImageUrl(relativePath);

      if (!imageAlt) {
        setImageAlt(file.name.replace(/\.[^/.]+$/, ''));
      }
      if (!imageCaption) {
        setImageCaption(file.name.replace(/\.[^/.]+$/, ''));
      }
      setUploadStatusMsg('');
    } catch {
      alert('خطا در بارگذاری تصویر. لطفاً تصویر دیگری انتخاب کنید.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle local audio file upload (stores in asset registry with immediate data extraction)
  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAudio(true);
    setUploadStatusMsg('در حال استخراج و بارگذاری فایل صوتی MP3...');

    try {
      // Register in AssetStore to get a clean fast Object URL and full Base64 DataURL for exports
      const { relativePath, name } = await assetStore.registerBlob(file, file.name, 'audio');
      setAudioUrl(relativePath);

      if (!audioTitle) {
        setAudioTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      setUploadStatusMsg('صوت با موفقیت بارگذاری شد و آماده است.');
    } catch {
      alert('خطا در خواندن فایل صوتی.');
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const handleInsertImage = () => {
    if (!imageUrl.trim()) {
      alert('لطفاً آدرس تصویر یا فایلی از گوشی/کامپیوتر انتخاب کنید.');
      return;
    }

    const alt = imageAlt.trim() || 'تصویر مقاله';
    const caption = imageCaption.trim();

    let snippet = '';
    if (caption) {
      snippet = `\n![${alt}](${imageUrl} "${caption}")\n`;
    } else {
      snippet = `\n![${alt}](${imageUrl})\n`;
    }

    onInsert(snippet);
    onClose();
  };

  const handleInsertAudio = () => {
    if (!audioUrl.trim()) {
      alert('لطفاً آدرس فایل صوتی یا فایلی از گوشی/کامپیوتر انتخاب کنید.');
      return;
    }

    const title = audioTitle.trim() || 'فایل صوتی و پادکست';
    const subtitle = audioSubtitle.trim();

    const tagText = subtitle ? `${title} | ${subtitle}` : title;
    const snippet = `\n!audio[${tagText}](${audioUrl})\n`;

    onInsert(snippet);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl text-slate-100 my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="bg-slate-900/90 border-b border-slate-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setTabOverride('image')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'image'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>افزودن تصویر (Image)</span>
              </button>
              <button
                onClick={() => setTabOverride('audio')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'audio'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Volume2 className="w-4 h-4" />
                <span>افزودن صوت و پادکست (Audio)</span>
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto max-h-[75vh] space-y-5 text-xs sm:text-sm">
          {activeTab === 'image' ? (
            /* IMAGE TAB */
            <div className="space-y-4">
              {/* Image Source Mode Selector */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <button
                  onClick={() => setImageSourceMode('upload')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                    imageSourceMode === 'upload'
                      ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200'
                      : 'border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>آپلود از گوشی / کامپیوتر</span>
                </button>
                <button
                  onClick={() => setImageSourceMode('url')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                    imageSourceMode === 'url'
                      ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200'
                      : 'border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>لینک مستقیم اینترنتی</span>
                </button>
                <button
                  onClick={() => setImageSourceMode('preset')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                    imageSourceMode === 'preset'
                      ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200'
                      : 'border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>تصاویر آماده و پیشنهادی</span>
                </button>
              </div>

              {/* Upload Input */}
              {imageSourceMode === 'upload' && (
                <div className="space-y-2">
                  <label className="block text-slate-300 font-medium">
                    انتخاب فایل تصویر (PNG, JPG, WEBP, SVG, GIF):
                  </label>
                  <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/80 rounded-2xl p-6 text-center transition-colors bg-slate-950/50">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                      id="image-file-upload-input"
                    />
                    <label
                      htmlFor="image-file-upload-input"
                      className="cursor-pointer flex flex-col items-center gap-2 text-slate-300"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <span className="font-semibold text-white">برای انتخاب تصویر کلیک کنید یا فایل را اینجا رها کنید</span>
                      <span className="text-xs text-slate-400">تصویر به صورت مستقیم و بدون نیاز به هاست درون فایل HTML جای‌گذاری می‌شود.</span>
                    </label>
                  </div>
                </div>
              )}

              {/* URL Input */}
              {imageSourceMode === 'url' && (
                <div className="space-y-2">
                  <label className="block text-slate-300 font-medium">آدرس URL تصویر:</label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                    dir="ltr"
                  />
                </div>
              )}

              {/* Preset Images */}
              {imageSourceMode === 'preset' && (
                <div className="space-y-2">
                  <label className="block text-slate-300 font-medium">انتخاب تصویر نمونه موضوعی:</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {PRESET_IMAGES.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setImageUrl(preset.url);
                          setImageAlt(preset.alt);
                          setImageCaption(preset.title);
                        }}
                        className={`p-2 rounded-xl border text-right transition-all flex items-center gap-2.5 ${
                          imageUrl === preset.url
                            ? 'bg-indigo-950 border-indigo-500 text-white'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.alt}
                          className="w-12 h-12 rounded-lg object-cover shrink-0"
                        />
                        <div className="overflow-hidden">
                          <p className="font-semibold truncate text-xs">{preset.title}</p>
                          <p className="text-[10px] text-slate-400 truncate">{preset.alt}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Image Preview & Details */}
              {imageUrl && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-300 text-xs">پیش‌نمایش تصویر:</p>
                    <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/60" dir="ltr">
                      {imageUrl}
                    </span>
                  </div>
                  <div className="max-h-48 overflow-hidden rounded-lg flex items-center justify-center bg-slate-900">
                    <img
                      src={assetStore.resolveUrl(imageUrl)}
                      alt="پیش‌نمایش"
                      className="max-h-44 max-w-full object-contain rounded-md"
                    />
                  </div>
                </div>
              )}

              {/* Extra Metadata (Alt & Caption) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-300 text-xs font-medium">متن جایگزین (Alt Text):</label>
                  <input
                    type="text"
                    value={imageAlt}
                    onChange={(e) => setImageAlt(e.target.value)}
                    placeholder="مثال: دیاگرام معماری مدل زبانی"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-slate-300 text-xs font-medium">توضیح زیر تصویر (Caption):</label>
                  <input
                    type="text"
                    value={imageCaption}
                    onChange={(e) => setImageCaption(e.target.value)}
                    placeholder="مثال: شکل ۱: مقایسه مصرف حافظه"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* AUDIO TAB */
            <div className="space-y-4">
              {/* Audio Source Mode Selector */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <button
                  onClick={() => setAudioSourceMode('upload')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                    audioSourceMode === 'upload'
                      ? 'bg-purple-950/80 border-purple-500 text-purple-200'
                      : 'border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>آپلود صوت از گوشی / سیستم</span>
                </button>
                <button
                  onClick={() => setAudioSourceMode('url')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                    audioSourceMode === 'url'
                      ? 'bg-purple-950/80 border-purple-500 text-purple-200'
                      : 'border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>لینک مستقیم صوت / پادکست</span>
                </button>
                <button
                  onClick={() => setAudioSourceMode('preset')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                    audioSourceMode === 'preset'
                      ? 'bg-purple-950/80 border-purple-500 text-purple-200'
                      : 'border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>صوت‌های نمونه برای تست</span>
                </button>
              </div>

              {/* Upload Audio File */}
              {audioSourceMode === 'upload' && (
                <div className="space-y-2">
                  <label className="block text-slate-300 font-medium">
                    انتخاب فایل صوتی (MP3, WAV, OGG, M4A, AAC):
                  </label>
                  <div className="border-2 border-dashed border-slate-700 hover:border-purple-500/80 rounded-2xl p-6 text-center transition-colors bg-slate-950/50">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioFileChange}
                      className="hidden"
                      id="audio-file-upload-input"
                    />
                    <label
                      htmlFor="audio-file-upload-input"
                      className="cursor-pointer flex flex-col items-center gap-2 text-slate-300"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                        <Volume2 className="w-6 h-6" />
                      </div>
                      <span className="font-semibold text-white">برای انتخاب فایل صوتی کلیک کنید</span>
                      <span className="text-xs text-slate-400">فایل صوتی مستقیماً درون سند HTML خروجی تعبیه شده و بدون نیاز به هاست اجرا می‌شود.</span>
                    </label>
                  </div>
                </div>
              )}

              {/* URL Input */}
              {audioSourceMode === 'url' && (
                <div className="space-y-2">
                  <label className="block text-slate-300 font-medium">آدرس لینک فایل صوتی (MP3 / Podcast URL):</label>
                  <input
                    type="url"
                    value={audioUrl}
                    onChange={(e) => setAudioUrl(e.target.value)}
                    placeholder="https://example.com/podcast.mp3"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-purple-500"
                    dir="ltr"
                  />
                </div>
              )}

              {/* Preset Audios */}
              {audioSourceMode === 'preset' && (
                <div className="space-y-2">
                  <label className="block text-slate-300 font-medium">انتخاب صوت و موسیقی نمونه:</label>
                  <div className="space-y-2">
                    {PRESET_AUDIOS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAudioUrl(preset.url);
                          setAudioTitle(preset.title);
                          setAudioSubtitle(preset.subtitle);
                        }}
                        className={`w-full p-2.5 rounded-xl border text-right transition-all flex items-center justify-between ${
                          audioUrl === preset.url
                            ? 'bg-purple-950 border-purple-500 text-white'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center shrink-0">
                            <Play className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-xs">{preset.title}</p>
                            <p className="text-[11px] text-slate-400">{preset.subtitle}</p>
                          </div>
                        </div>
                        {audioUrl === preset.url && <Check className="w-4 h-4 text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Audio Player Preview */}
              {audioUrl && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-300 text-xs flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                      <span>تست و پیش‌نمایش پخش صدا:</span>
                    </p>
                    <span className="text-[10px] font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/60" dir="ltr">
                      {audioUrl}
                    </span>
                  </div>
                  <audio controls className="w-full h-10 rounded-lg" src={assetStore.resolveUrl(audioUrl)} />
                </div>
              )}

              {/* Audio Titles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-300 text-xs font-medium">عنوان صوت / پادکست:</label>
                  <input
                    type="text"
                    value={audioTitle}
                    onChange={(e) => setAudioTitle(e.target.value)}
                    placeholder="مثال: پادکست صوتی خلاصه فصل اول"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-slate-300 text-xs font-medium">گوینده / توضیحات فرعی:</label>
                  <input
                    type="text"
                    value={audioSubtitle}
                    onChange={(e) => setAudioSubtitle(e.target.value)}
                    placeholder="مثال: خوانش توسط دکتر رضایی (مدت ۵ دقیقه)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-900/90 border-t border-slate-800 p-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white text-xs font-medium rounded-xl transition-colors"
          >
            انصراف
          </button>

          {activeTab === 'image' ? (
            <button
              onClick={handleInsertImage}
              disabled={!imageUrl}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>درج تصویر در مارک‌داون</span>
            </button>
          ) : (
            <button
              onClick={handleInsertAudio}
              disabled={!audioUrl}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>درج فایل صوتی در مارک‌داون</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
