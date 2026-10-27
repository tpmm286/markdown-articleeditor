import JSZip from 'jszip';
import { ArticleMetadata, generateStandaloneArticleHtml, getAudioMimeType } from './markdown-converter';
import { assetStore, dataUrlToUint8Array } from './asset-store';

export interface ZipExportResult {
  blob: Blob;
  filename: string;
  stats: {
    fileCount: number;
    imageCount: number;
    audioCount: number;
    totalSizeKb: number;
    zipSizeKb: number;
  };
}

/**
 * Sanitizes and normalizes any asset path so it strictly starts with `./assets/` or `./`
 */
export function normalizeRelativeAssetPath(rawPath: string): string {
  if (!rawPath) return '';
  let clean = rawPath.trim();

  // Already strictly formatted as `./assets/...`
  if (clean.startsWith('./assets/')) {
    return clean;
  }

  // `/assets/...` -> `./assets/...`
  if (clean.startsWith('/assets/')) {
    return `.${clean}`;
  }

  // `assets/...` -> `./assets/...`
  if (clean.startsWith('assets/')) {
    return `./${clean}`;
  }

  // `./...`
  if (clean.startsWith('./')) {
    return clean;
  }

  // `../...`
  if (clean.startsWith('../')) {
    return clean;
  }

  // If it is a bare filename with image or audio extension, prefix with `./assets/`
  if (/^[a-zA-Z0-9._-]+\.(png|jpe?g|webp|gif|svg|mp3|wav|ogg|m4a|aac|flac)$/i.test(clean)) {
    return `./assets/${clean}`;
  }

  return clean;
}

/**
 * Creates an ultra-optimized, self-contained offline ZIP package:
 * - index.html with guaranteed relative links strictly prefixed with `./assets/`
 * - assets/ folder containing binary media files (images & audio)
 * - README.txt with instructions for offline reading
 */
export async function generateArticleZipPackage(
  markdown: string,
  metadata: ArticleMetadata
): Promise<ZipExportResult> {
  const zip = new JSZip();
  const assetsFolder = zip.folder('assets');

  // Track asset replacements (original src/id/url -> relative zip path like `./assets/image_1.png`)
  const assetMap = new Map<string, string>();
  const usedFileNames = new Set<string>();
  let imageCounter = 1;
  let audioCounter = 1;
  let totalOriginalBytes = 0;

  const registerAssetBinary = (
    binaryData: Uint8Array,
    mimeType: string,
    extension: string,
    isAudio: boolean,
    keysToMap: (string | undefined | null)[],
    preferredName?: string
  ): string => {
    if (!binaryData || binaryData.length === 0) return '';

    let ext = (extension || '').toLowerCase().replace(/^\./, '').trim();
    if (!ext) {
      if (isAudio) {
        if (mimeType.includes('wav')) ext = 'wav';
        else if (mimeType.includes('ogg') || mimeType.includes('opus')) ext = 'ogg';
        else if (mimeType.includes('mp4') || mimeType.includes('m4a') || mimeType.includes('aac')) ext = 'm4a';
        else if (mimeType.includes('flac')) ext = 'flac';
        else ext = 'mp3';
      } else {
        if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
        else if (mimeType.includes('png')) ext = 'png';
        else if (mimeType.includes('webp')) ext = 'webp';
        else if (mimeType.includes('gif')) ext = 'gif';
        else if (mimeType.includes('svg')) ext = 'svg';
        else ext = 'png';
      }
    }

    // Determine unique filename
    let fileName = '';
    if (preferredName && preferredName.includes('.')) {
      const cleanBase = preferredName.replace(/[\\/:*?"<>|]+/g, '_');
      if (!usedFileNames.has(cleanBase)) {
        fileName = cleanBase;
      }
    }

    if (!fileName) {
      fileName = isAudio ? `audio_${audioCounter++}.${ext}` : `image_${imageCounter++}.${ext}`;
      while (usedFileNames.has(fileName)) {
        fileName = isAudio ? `audio_${audioCounter++}.${ext}` : `image_${imageCounter++}.${ext}`;
      }
    }

    usedFileNames.add(fileName);
    const relativePath = `./assets/${fileName}`;

    totalOriginalBytes += binaryData.length;
    if (assetsFolder) {
      assetsFolder.file(fileName, binaryData);
    }

    for (const k of keysToMap) {
      if (!k) continue;
      const keyStr = k.trim();
      if (!keyStr) continue;

      assetMap.set(keyStr, relativePath);

      try {
        assetMap.set(decodeURI(keyStr), relativePath);
        assetMap.set(encodeURI(keyStr), relativePath);
        assetMap.set(decodeURIComponent(keyStr), relativePath);
        assetMap.set(encodeURIComponent(keyStr), relativePath);
      } catch {
        // Ignore URI decode errors
      }

      // Also map bare path without leading ./ or /
      const bare = keyStr.replace(/^\.?\//, '');
      if (bare && bare !== keyStr) {
        assetMap.set(bare, relativePath);
        assetMap.set(`./${bare}`, relativePath);
      }

      // Also map without query parameters or hash
      const base = keyStr.split('?')[0].split('#')[0];
      if (base && base !== keyStr) {
        assetMap.set(base, relativePath);
      }
    }

    // Always map the generated relative path and variants
    assetMap.set(relativePath, relativePath);
    assetMap.set(`assets/${fileName}`, relativePath);
    assetMap.set(`/assets/${fileName}`, relativePath);
    assetMap.set(fileName, relativePath);

    return relativePath;
  };

  // 1. Gather ONLY active assets referenced in the markdown content and metadata
  const activeAssets = assetStore.getActiveAssets(markdown, metadata.coverImage);
  for (const stored of activeAssets) {
    if (stored.dataUrl) {
      const binary = dataUrlToUint8Array(stored.dataUrl);
      if (binary.data.length > 0) {
        const isAudio = stored.type === 'audio' || binary.mimeType.startsWith('audio/');
        const ext = binary.extension || (isAudio ? 'mp3' : 'png');
        const keys = [
          stored.id,
          stored.objectUrl,
          stored.dataUrl,
          stored.name,
          stored.relativePath,
          `assets/${stored.name}`,
          `./assets/${stored.name}`,
          `/assets/${stored.name}`,
          ...(stored.associatedPaths || []),
        ].filter(Boolean) as string[];

        registerAssetBinary(binary.data, binary.mimeType || stored.mimeType, ext, isAudio, keys, stored.name);
      }
    }
  }

  // 2. Deep scan markdown text for all audio & image links (markdown syntax and HTML tags)
  const mediaLinkRegexes = [
    /!audio\[.*?\]\((.*?)\)/gi,
    /!\[.*?\]\((.*?)\)/gi,
    /<img[^>]+src=["'](.*?)["']/gi,
    /<source[^>]+src=["'](.*?)["']/gi,
    /<audio[^>]+src=["'](.*?)["']/gi,
    /<video[^>]+src=["'](.*?)["']/gi,
    /<a[^>]+href=["'](.*?)["'][^>]*download/gi,
  ];

  for (const regex of mediaLinkRegexes) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(markdown)) !== null) {
      let rawUrl = (match[1] || '').trim();
      // Clean quotes or titles in markdown like `url "title"`
      if (rawUrl.includes(' ') && !rawUrl.startsWith('data:')) {
        rawUrl = rawUrl.split(' ')[0].trim();
      }
      if (!rawUrl || assetMap.has(rawUrl)) continue;

      // Check if it's in assetStore (by path, filename, id, or objectUrl)
      const stored = assetStore.get(rawUrl);
      if (stored && stored.dataUrl) {
        const binary = dataUrlToUint8Array(stored.dataUrl);
        if (binary.data.length > 0) {
          const isAudio = stored.type === 'audio' || binary.mimeType.startsWith('audio/');
          const ext = binary.extension || (isAudio ? 'mp3' : 'png');
          registerAssetBinary(
            binary.data,
            binary.mimeType,
            ext,
            isAudio,
            [rawUrl, stored.id, stored.objectUrl, stored.dataUrl, stored.relativePath, stored.name],
            stored.name
          );
          continue;
        }
      }

      // Check if it's an inline DataURL
      if (rawUrl.startsWith('data:')) {
        const binary = dataUrlToUint8Array(rawUrl);
        if (binary.data.length > 0) {
          const isAudio = rawUrl.startsWith('data:audio/') || binary.mimeType.startsWith('audio/');
          const ext = binary.extension || (isAudio ? 'mp3' : 'png');
          registerAssetBinary(binary.data, binary.mimeType, ext, isAudio, [rawUrl]);
          continue;
        }
      }

      // Check if it's a blob URL that can be fetched in browser
      if (rawUrl.startsWith('blob:') && typeof window !== 'undefined') {
        try {
          const response = await fetch(rawUrl);
          const blob = await response.blob();
          const buffer = await blob.arrayBuffer();
          const u8 = new Uint8Array(buffer);
          if (u8.length > 0) {
            const isAudio = blob.type.startsWith('audio/') || rawUrl.includes('audio');
            let ext = isAudio ? 'mp3' : 'png';
            if (blob.type.includes('jpeg') || blob.type.includes('jpg')) ext = 'jpg';
            else if (blob.type.includes('png')) ext = 'png';
            else if (blob.type.includes('webp')) ext = 'webp';
            else if (blob.type.includes('gif')) ext = 'gif';
            else if (blob.type.includes('svg')) ext = 'svg';
            else if (blob.type.includes('mpeg') || blob.type.includes('mp3')) ext = 'mp3';
            else if (blob.type.includes('wav')) ext = 'wav';
            else if (blob.type.includes('ogg')) ext = 'ogg';

            registerAssetBinary(u8, blob.type, ext, isAudio, [rawUrl]);
            continue;
          }
        } catch (e) {
          console.warn('Failed to fetch blob URL during zip generation:', rawUrl, e);
        }
      }

      // Check if it's a remote HTTP/HTTPS media URL (attempt offline bundling)
      if ((rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) && typeof window !== 'undefined') {
        try {
          const response = await fetch(rawUrl, { mode: 'cors' });
          if (response.ok) {
            const blob = await response.blob();
            const buffer = await blob.arrayBuffer();
            const u8 = new Uint8Array(buffer);
            if (u8.length > 0) {
              const isAudio = blob.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)($|\?)/i.test(rawUrl);
              let ext = isAudio ? 'mp3' : 'png';
              if (blob.type.includes('jpeg') || blob.type.includes('jpg')) ext = 'jpg';
              else if (blob.type.includes('png')) ext = 'png';
              else if (blob.type.includes('webp')) ext = 'webp';
              else if (blob.type.includes('gif')) ext = 'gif';
              else if (blob.type.includes('svg')) ext = 'svg';
              else if (blob.type.includes('mpeg') || blob.type.includes('mp3')) ext = 'mp3';
              else if (blob.type.includes('wav')) ext = 'wav';
              else if (blob.type.includes('ogg')) ext = 'ogg';

              registerAssetBinary(u8, blob.type, ext, isAudio, [rawUrl]);
            }
          }
        } catch {
          // Cross-origin restriction or offline; leave URL as is
        }
      }

      // If it's already a relative path to assets like `./assets/sample.png`, ensure it's recorded
      if (rawUrl.startsWith('./assets/') || rawUrl.startsWith('assets/') || rawUrl.startsWith('/assets/')) {
        const normalized = normalizeRelativeAssetPath(rawUrl);
        assetMap.set(rawUrl, normalized);
      }
    }
  }

  // 3. Scan for any raw base64 data URLs left in text
  const rawDataUrlRegex = /data:(image|audio)\/([a-zA-Z0-9.+_-]+);base64,([A-Za-z0-9+/=]+)/g;
  let dataMatch: RegExpExecArray | null;
  while ((dataMatch = rawDataUrlRegex.exec(markdown)) !== null) {
    const fullDataUrl = dataMatch[0];
    if (!assetMap.has(fullDataUrl)) {
      const type = dataMatch[1];
      const binary = dataUrlToUint8Array(fullDataUrl);
      if (binary.data.length > 0) {
        const isAudio = type === 'audio' || binary.mimeType.startsWith('audio/');
        const ext = binary.extension || (isAudio ? 'mp3' : 'png');
        registerAssetBinary(binary.data, binary.mimeType, ext, isAudio, [fullDataUrl]);
      }
    }
  }

  // Asset URL resolver for HTML generator to ensure every asset points strictly to `./assets/...`
  const assetUrlResolver = (src: string): string => {
    if (!src) return '';
    let clean = src.trim();

    // Direct map match
    if (assetMap.has(clean)) {
      return assetMap.get(clean)!;
    }

    try {
      const decoded = decodeURIComponent(clean);
      if (assetMap.has(decoded)) {
        return assetMap.get(decoded)!;
      }
    } catch {}

    // Check with/without leading ./ or /
    const bare = clean.replace(/^\.?\//, '');
    if (assetMap.has(bare)) return assetMap.get(bare)!;
    if (assetMap.has(`./${bare}`)) return assetMap.get(`./${bare}`)!;
    if (assetMap.has(`assets/${bare}`)) return assetMap.get(`assets/${bare}`)!;
    if (assetMap.has(`./assets/${bare}`)) return assetMap.get(`./assets/${bare}`)!;

    // Check in assetStore
    const stored = assetStore.get(clean);
    if (stored) {
      if (stored.id && assetMap.has(stored.id)) return assetMap.get(stored.id)!;
      if (stored.objectUrl && assetMap.has(stored.objectUrl)) return assetMap.get(stored.objectUrl)!;
      if (stored.dataUrl && assetMap.has(stored.dataUrl)) return assetMap.get(stored.dataUrl)!;
      if (stored.name && assetMap.has(stored.name)) return assetMap.get(stored.name)!;
      if (stored.relativePath && assetMap.has(stored.relativePath)) return assetMap.get(stored.relativePath)!;
    }

    // If it's a bare local asset file name or already `./assets/...`
    if (clean.startsWith('./assets/')) {
      return clean;
    }
    if (clean.startsWith('assets/')) {
      return `./${clean}`;
    }
    if (clean.startsWith('/assets/')) {
      return `.${clean}`;
    }

    if (/^[a-zA-Z0-9._-]+\.(png|jpe?g|webp|gif|svg|mp3|wav|ogg|m4a|aac|flac)$/i.test(clean)) {
      return `./assets/${clean}`;
    }

    return clean;
  };

  // 4. Generate clean index.html with strictly relative ./assets/ references
  let htmlContent = generateStandaloneArticleHtml(markdown, metadata, {
    minify: false,
    compressLz: false,
    assetUrlResolver,
  });

  // 5. Post-generation deep normalization pass on HTML media elements:
  // Strictly enforce that media paths in img, audio, source, video, and download links use `./assets/...`
  htmlContent = htmlContent.replace(/<(img|source|audio|video)\s+([^>]*?)src=["']([^"']+)["']/gi, (match, tag, before, src) => {
    const resolved = assetUrlResolver(src);
    return `<${tag} ${before}src="${resolved}"`;
  });

  htmlContent = htmlContent.replace(/<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?download[^>]*)>/gi, (match, before, href, after) => {
    const resolved = assetUrlResolver(href);
    return `<a ${before}href="${resolved}"${after}>`;
  });

  // Final sanity check to convert any lingering `/assets/` or `assets/` into `./assets/`
  htmlContent = htmlContent.replace(/src="\/assets\//g, 'src="./assets/');
  htmlContent = htmlContent.replace(/src="assets\//g, 'src="./assets/');
  htmlContent = htmlContent.replace(/href="\/assets\//g, 'href="./assets/');
  htmlContent = htmlContent.replace(/href="assets\//g, 'href="./assets/');

  zip.file('index.html', htmlContent);

  // Also include the original markdown file
  zip.file('article.md', markdown);

  // Also embed project.mdpress for full project restoration capability
  const projectDraft = {
    format: 'md-article-project',
    version: 1,
    savedAt: new Date().toISOString(),
    metadata,
    markdown,
    assets: activeAssets.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      mimeType: a.mimeType,
      size: a.size,
      dataUrl: a.dataUrl,
      relativePath: a.relativePath || `./assets/${a.name}`,
    })),
  };
  zip.file('project.mdpress', JSON.stringify(projectDraft, null, 2));

  // 6. Generate README.txt with Persian guide
  const dateStr = metadata.date || new Date().toLocaleDateString('fa-IR');
  const readmeContent = `بسته کامل و آفلاین مقاله
==================================================
عنوان مقاله: ${metadata.title || 'بدون عنوان'}
${metadata.subtitle ? `زیرعنوان: ${metadata.subtitle}\n` : ''}${metadata.author ? `نویسنده: ${metadata.author}\n` : ''}تاریخ: ${dateStr}
تعداد تصاویر: ${imageCounter - 1} | تعداد فایل‌های صوتی: ${audioCounter - 1}
==================================================

راهنمای استفاده و مطالعه:
۱. برای مطالعه کامل مقاله، کافی است فایل «index.html» را در هر مرورگری (Chrome, Firefox, Safari, Edge و ...) باز کنید.
۲. تمامی فایل‌های صوتی و تصویری درون پوشه «./assets/» در کنار فایل اصلی قرار گرفته‌اند.
۳. کلیه آدرس‌دهی‌ها به شکل استاندارد مسیرهای نسبی با پیشوند «./assets/...» تنظیم شده‌اند تا بدون نیاز به اینترنت و بدون قطعی لینک‌ها، در حالت محلی و انواع وب‌سرورها به درستی کار کنند.
۴. برای ویرایش مجدد این مقاله، می‌توانید فایل «project.mdpress» موجود در این بسته را در سامانه بارگذاری کنید.
`;

  zip.file('README.txt', readmeContent);

  // 7. Generate compressed ZIP Blob
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  let cleanTitle = (metadata.title || 'article')
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF\s-]+/g, '')
    .trim()
    .replace(/\s+/g, '-');
  if (!cleanTitle) cleanTitle = 'article';

  const filename = `${cleanTitle}-package.zip`;

  return {
    blob: zipBlob,
    filename,
    stats: {
      fileCount: 4 + (imageCounter - 1) + (audioCounter - 1),
      imageCount: imageCounter - 1,
      audioCount: audioCounter - 1,
      totalSizeKb: Math.round(totalOriginalBytes / 1024),
      zipSizeKb: Math.round(zipBlob.size / 1024),
    },
  };
}

/**
 * Universal safe file download utility that prevents memory leaks and tab freezing
 */
export function safeDownloadBlob(blob: Blob, filename: string): void {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (err) {
    console.error('safeDownloadBlob error:', err);
  }
}


