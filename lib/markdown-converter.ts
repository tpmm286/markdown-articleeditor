import { Marked } from 'marked';
import hljs from 'highlight.js';
import katex from 'katex';
import 'katex/dist/contrib/mhchem.js';
import LZString from 'lz-string';
import { assetStore } from './asset-store';

export type ArticleTheme = 'academic' | 'journalistic' | 'minimalist' | 'technical' | 'classic';
export type ReadingMode = 'auto' | 'day' | 'night' | 'reading';

export interface StandaloneHtmlOptions {
  minify?: boolean;
  compressLz?: boolean;
  assetUrlResolver?: (src: string) => string;
}

export interface ArticleMetadata {
  title: string;
  subtitle: string;
  author: string;
  affiliation: string;
  date: string;
  journal: string;
  abstract: string;
  keywords: string;
  coverImage?: string;
  direction: 'rtl' | 'ltr' | 'auto';
  showToc: boolean;
  showMetadata: boolean;
  theme: ArticleTheme;
  readingMode?: ReadingMode;
  fontSize?: number;
  lineHeight?: number;
  snippets?: { name: string; content: string }[];
}

export const DEFAULT_METADATA: ArticleMetadata = {
  title: '',
  subtitle: '',
  author: '',
  affiliation: '',
  date: '',
  journal: '',
  abstract: '',
  keywords: '',
  coverImage: '',
  direction: 'rtl',
  showToc: true,
  showMetadata: true,
  theme: 'academic',
  fontSize: 16,
  lineHeight: 1.8,
  snippets: [],
};

// Math macros for Physics, Chemistry, and Geometry
const KATEX_MACROS = {
  // Chemistry
  '\\ce': '\\ce{#1}',
  '\\pu': '\\pu{#1}',
  // Physics
  '\\vec': '\\mathbf{#1}',
  '\\dd': '\\mathrm{d}',
  '\\diff': '\\frac{\\mathrm{d}#1}{\\mathrm{d}#2}',
  '\\pdiff': '\\frac{\\partial #1}{\\partial #2}',
  '\\bra': '\\left\\langle #1 \\right\\vert',
  '\\ket': '\\left\\vert #1 \\right\\rangle',
  '\\braket': '\\left\\langle #1 \\middle\\vert #2 \\right\\rangle',
  '\\grad': '\\boldsymbol{\\nabla}',
  '\\curl': '\\boldsymbol{\\nabla} \\times',
  '\\div': '\\boldsymbol{\\nabla} \\cdot',
  '\\hbar': '\\hbar',
  '\\angstrom': '{\\mathring{\\mathrm{A}}}',
  // Geometry
  '\\degree': '^{\\circ}',
  '\\ang': '#1^{\\circ}',
  '\\angle': '\\angle',
  '\\triangle': '\\triangle',
  '\\parallel': '\\mathbin{\\!\\!/\\!\\!/\\!\\!}',
  '\\perp': '\\perp',
  '\\cong': '\\cong',
  '\\sim': '\\sim',
};

// Fast O(N) word counting with 0 intermediate string array memory allocation
export function countWordsFast(text: string): number {
  if (!text) return 0;
  let count = 0;
  let inWord = false;
  const len = text.length;

  for (let i = 0; i < len; i++) {
    const code = text.charCodeAt(i);
    // Treat ASCII whitespace, newlines, carriage returns, and nbsp as space
    const isSpace = code <= 32 || code === 160;
    if (isSpace) {
      inWord = false;
    } else if (!inWord) {
      inWord = true;
      count++;
    }
  }
  return count;
}

// Helper to get audio MIME type based on file extension or data URL
export function getAudioMimeType(url: string): string {
  const clean = (url || '').toLowerCase().split('?')[0].split('#')[0].trim();
  if (clean.endsWith('.wav')) return 'audio/wav';
  if (clean.endsWith('.ogg') || clean.endsWith('.opus')) return 'audio/ogg';
  if (clean.endsWith('.m4a') || clean.endsWith('.mp4') || clean.endsWith('.aac')) return 'audio/mp4';
  if (clean.endsWith('.flac')) return 'audio/flac';
  if (clean.startsWith('data:audio/')) {
    const match = clean.match(/data:(audio\/[a-zA-Z0-9.+_-]+)/);
    if (match) return match[1];
  }
  return 'audio/mpeg';
}

// Convert math expressions and audio directives before marked parsing to protect math and media
// Fast path: extracts code blocks first to avoid regex scanning across large code snippets
function preprocessMath(
  markdown: string,
  forStandalone = false,
  customUrlResolver?: (url: string) => string
): { text: string; mathMap: Map<string, string> } {
  const mathMap = new Map<string, string>();
  let count = 0;

  const resolveMediaUrl = (url: string): string => {
    if (customUrlResolver) return customUrlResolver(url);
    return forStandalone ? assetStore.resolveForStandaloneExport(url) : assetStore.resolveUrl(url);
  };

  // 1. Protect Code Fences (``` ... ```) and Inline Code (` ... `)
  const codeBlocks: string[] = [];
  let text = markdown.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
    const placeholder = `%%%CODE_GUARD_${codeBlocks.length}%%%`;
    codeBlocks.push(match);
    return placeholder;
  });

  // 2. Custom Audio Syntax !audio[Title | Subtitle](url)
  if (text.includes('!audio[')) {
    text = text.replace(/!audio\[(.*?)\]\((.*?)\)/gi, (_, audioInfo, audioUrl) => {
      const placeholder = `%%%AUDIO_TAG_${count}%%%`;
      const cleanInfo = (audioInfo || '').trim();
      let [audioTitle, audioSubtitle] = cleanInfo.split('|').map((s: string) => s.trim());
      if (!audioTitle) audioTitle = 'فایل صوتی و پادکست';
      
      const cleanUrl = audioUrl.trim();
      const resolvedUrl = resolveMediaUrl(cleanUrl);
      
      const audioHtml = `<div class="article-audio-box my-6 p-4 rounded-2xl border transition-all">
        <div class="article-audio-header flex items-center justify-between gap-3 mb-3">
          <div class="flex items-center gap-3">
            <div class="article-audio-icon w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 flex items-center justify-center font-bold text-lg shrink-0">🔊</div>
            <div class="article-audio-info">
              <h4 class="article-audio-title font-bold text-sm text-main m-0">${escapeXml(audioTitle)}</h4>
              ${audioSubtitle ? `<p class="article-audio-subtitle text-xs text-muted mt-0.5 m-0 opacity-80">${escapeXml(audioSubtitle)}</p>` : ''}
            </div>
          </div>
          <span class="article-audio-badge text-[10px] px-2.5 py-1 rounded-full font-mono bg-indigo-500/10 text-indigo-500 font-semibold shrink-0">صوت / AUDIO</span>
        </div>
        <audio controls preload="metadata" class="article-audio-player w-full rounded-xl">
          <source src="${resolvedUrl}" type="${getAudioMimeType(resolvedUrl)}">
          مرورگر شما از پخش مستقیم صوت پشتیبانی نمی‌کند. <a href="${resolvedUrl}" download class="text-indigo-500 underline text-xs">دانلود فایل صوتی</a>
        </audio>
      </div>`;

      mathMap.set(placeholder, audioHtml);
      count++;
      return `\n\n${placeholder}\n\n`;
    });
  }

  // 3. Latex Environment Blocks (\begin{equation}...\end{equation}, \begin{align}...\end{align}, etc.)
  if (text.includes('\\begin{')) {
    const envRegex = /\\begin\{(equation|align|align\*|matrix|pmatrix|bmatrix|vmatrix|cases|gather|math)\}([\s\S]+?)\\end\{\1\}/g;
    text = text.replace(envRegex, (fullMath) => {
      const placeholder = `%%%MATH_ENV_${count}%%%`;
      try {
        const rendered = katex.renderToString(fullMath.trim(), {
          displayMode: true,
          throwOnError: false,
          trust: true,
          macros: KATEX_MACROS,
        });
        mathMap.set(placeholder, `<div class="katex-block my-6 overflow-x-auto text-center font-sans" dir="ltr">${rendered}</div>`);
      } catch {
        mathMap.set(placeholder, `<pre class="katex-error bg-rose-950/20 text-rose-300 p-3 rounded-lg text-xs font-mono" dir="ltr">${fullMath}</pre>`);
      }
      count++;
      return placeholder;
    });
  }

  // 4. Block Math $$...$$
  if (text.includes('$$')) {
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, mathCode) => {
      const placeholder = `%%%MATH_BLOCK_${count}%%%`;
      try {
        const rendered = katex.renderToString(mathCode.trim(), {
          displayMode: true,
          throwOnError: false,
          trust: true,
          macros: KATEX_MACROS,
        });
        mathMap.set(placeholder, `<div class="katex-block my-6 overflow-x-auto text-center font-sans" dir="ltr">${rendered}</div>`);
      } catch {
        mathMap.set(placeholder, `<pre class="katex-error bg-rose-950/20 text-rose-300 p-3 rounded-lg text-xs font-mono" dir="ltr">${mathCode}</pre>`);
      }
      count++;
      return placeholder;
    });
  }

  // 5. Inline Math $...$
  if (text.includes('$')) {
    text = text.replace(/(^|[^\\])\$([^\$\n]+?)\$/g, (_, prefix, mathCode) => {
      const placeholder = `%%%MATH_INLINE_${count}%%%`;
      try {
        const rendered = katex.renderToString(mathCode.trim(), {
          displayMode: false,
          throwOnError: false,
          trust: true,
          macros: KATEX_MACROS,
        });
        mathMap.set(placeholder, `<span class="katex-inline inline-block px-1 font-sans" dir="ltr">${rendered}</span>`);
      } catch {
        mathMap.set(placeholder, `<code dir="ltr">${mathCode}</code>`);
      }
      count++;
      return prefix + placeholder;
    });
  }

  // 6. Restore protected code blocks
  for (let i = 0; i < codeBlocks.length; i++) {
    text = text.replace(`%%%CODE_GUARD_${i}%%%`, codeBlocks[i]);
  }

  return { text, mathMap };
}

// Post-process callout blocks and restore Math
function postProcessHtml(html: string, mathMap: Map<string, string>): string {
  let result = html;

  // Restore math placeholders
  mathMap.forEach((renderedMath, placeholder) => {
    result = result.replaceAll(placeholder, renderedMath);
  });

  // Enhance blockquotes for callouts (> [!NOTE], > [!WARNING], > [!TIP], > [!IMPORTANT])
  if (result.includes('[!')) {
    result = result.replace(
      /<blockquote>\s*<p>\s*\[\!(NOTE|WARNING|TIP|IMPORTANT|INFO)\]\s*([\s\S]*?)<\/p>\s*<\/blockquote>/gi,
      (_, type, content) => {
        const typeUpper = type.toUpperCase();
        let calloutClass = 'callout-note';
        let title = 'یادداشت';
        let icon = 'ℹ️';

        if (typeUpper === 'WARNING') {
          calloutClass = 'callout-warning';
          title = 'هشدار';
          icon = '⚠️';
        } else if (typeUpper === 'TIP') {
          calloutClass = 'callout-tip';
          title = 'نکته کلیدی';
          icon = '💡';
        } else if (typeUpper === 'IMPORTANT') {
          calloutClass = 'callout-important';
          title = 'مهم';
          icon = '🚨';
        }

        return `<div class="callout-box ${calloutClass}">
          <div class="callout-header">
            <span>${icon}</span>
            <span>${title}</span>
          </div>
          <div class="callout-content">${content}</div>
        </div>`;
      }
    );
  }

  return result;
}

// Global cached Marked instance with optimized singleton renderer
let globalMarkedInstance: Marked | null = null;
let currentTocCollector: { id: string; text: string; level: number }[] = [];
let currentIdCounts = new Map<string, number>();

function getSharedMarkedInstance(
  forStandalone = false,
  customUrlResolver?: (url: string) => string
): Marked {
  const instance = new Marked({
    async: false,
    gfm: true,
    breaks: true,
  });

  const resolveMediaUrl = (url: string): string => {
    if (customUrlResolver) return customUrlResolver(url);
    return forStandalone ? assetStore.resolveForStandaloneExport(url) : assetStore.resolveUrl(url);
  };

  instance.use({
    renderer: {
      heading(token: any) {
        const text = this.parser.parseInline(token.tokens);
        const depth = token.depth;
        const plainText = text.replace(/<[^>]*>?/gm, '').trim();
        const baseSlug = plainText
          .toLowerCase()
          .replace(/[^\w\u0600-\u06FF]+/g, '-')
          .replace(/^-+|-+$/g, '');

        const slug = baseSlug || `section-${currentTocCollector.length + 1}`;
        const count = currentIdCounts.get(slug) || 0;
        currentIdCounts.set(slug, count + 1);
        const id = count === 0 ? slug : `${slug}-${count + 1}`;

        if (depth <= 3) {
          currentTocCollector.push({ id, text: plainText || 'بخش بدون عنوان', level: depth });
        }

        return `<h${depth} id="${id}" class="article-heading heading-${depth}">${text}</h${depth}>`;
      },
      code(token: any) {
        const text = token.text;
        const lang = (token.lang || '').toLowerCase().trim();

        // Handle chemistry/chem code block
        if (lang === 'chem' || lang === 'chemistry') {
          try {
            const rendered = katex.renderToString(`\\ce{${text.trim()}}`, {
              displayMode: true,
              throwOnError: false,
              macros: KATEX_MACROS,
            });
            return `<div class="katex-block my-6 overflow-x-auto text-center font-sans" dir="ltr">${rendered}</div>`;
          } catch {
            // fallback to code
          }
        }

        let highlighted = text;
        if (lang && hljs.getLanguage(lang)) {
          try {
            highlighted = hljs.highlight(text, { language: lang }).value;
          } catch {
            highlighted = text;
          }
        } else if (text.length < 5000) {
          // Only run auto-highlighting for reasonably sized code snippets to prevent freeze
          try {
            highlighted = hljs.highlightAuto(text).value;
          } catch {
            highlighted = text;
          }
        }
        return `<div class="article-code-block my-6 rounded-xl overflow-hidden border border-slate-700/60 shadow-md dir-ltr text-left" dir="ltr">
          <div class="bg-slate-800 text-slate-300 px-4 py-1.5 text-xs font-mono flex items-center justify-between border-b border-slate-700">
            <span>${lang || 'code'}</span>
            <span class="text-slate-400 text-[10px]">LTR</span>
          </div>
          <pre class="p-4 bg-slate-900 text-slate-100 overflow-x-auto text-sm leading-relaxed"><code class="hljs ${lang ? `language-${lang}` : ''}">${highlighted}</code></pre>
        </div>`;
      },
      table(token: any) {
        const aligns = token.align || [];

        const headerCells = token.header
          ? token.header
              .map((cell: any, idx: number) => {
                const alignVal = aligns[idx] || 'right';
                const alignStyle = `text-align: ${alignVal};`;
                const content = this.parser.parseInline(cell.tokens || []);
                return `<th style="${alignStyle}" class="px-4 py-3 font-bold text-sm">${content}</th>`;
              })
              .join('')
          : '';

        const bodyRows = token.rows
          ? token.rows
              .map((row: any, rIdx: number) => {
                const cells = row
                  .map((cell: any, cIdx: number) => {
                    const alignVal = aligns[cIdx] || 'right';
                    const alignStyle = `text-align: ${alignVal};`;
                    const content = this.parser.parseInline(cell.tokens || []);
                    return `<td style="${alignStyle}" class="px-4 py-2.5 text-sm">${content}</td>`;
                  })
                  .join('');
                return `<tr>${cells}</tr>`;
              })
              .join('')
          : '';

        return `<div class="article-table-wrapper my-6 overflow-x-auto rounded-xl border shadow-xs transition-colors">
          <table class="article-table w-full text-sm border-collapse">
            ${headerCells ? `<thead><tr>${headerCells}</tr></thead>` : ''}
            <tbody>${bodyRows}</tbody>
          </table>
        </div>`;
      },
      blockquote(token: any) {
        const quoteText = this.parser.parse(token.tokens);
        return `<blockquote class="article-blockquote my-6 pr-4 py-2 rounded-l-md italic">${quoteText}</blockquote>`;
      },
      image(token: any) {
        const href = (token.href || '').trim();
        const text = token.text || '';
        const title = token.title || '';

        const isAudio =
          href.startsWith('data:audio/') ||
          /\.(mp3|wav|ogg|m4a|aac|flac|opus|wma)($|\?)/i.test(href) ||
          text.toLowerCase().startsWith('audio:') ||
          text.toLowerCase().startsWith('صوت:') ||
          text.toLowerCase().startsWith('پادکست:');

        const resolvedSrc = resolveMediaUrl(href);

        if (isAudio) {
          let cleanText = text.replace(/^(audio:|صوت:|پادکست:)\s*/i, '').trim() || 'فایل صوتی و پادکست';
          let [audioTitle, audioSubtitle] = cleanText.split('|').map((s: string) => s.trim());
          if (!audioSubtitle && title) {
            audioSubtitle = title;
          }
          return `<div class="article-audio-box my-6 p-4 rounded-2xl border transition-all">
            <div class="article-audio-header flex items-center justify-between gap-3 mb-3">
              <div class="flex items-center gap-3">
                <div class="article-audio-icon w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 flex items-center justify-center font-bold text-lg shrink-0">🔊</div>
                <div class="article-audio-info">
                  <h4 class="article-audio-title font-bold text-sm text-main m-0">${escapeXml(audioTitle || 'پادکست و فایل صوتی')}</h4>
                  ${audioSubtitle ? `<p class="article-audio-subtitle text-xs text-muted mt-0.5 m-0 opacity-80">${escapeXml(audioSubtitle)}</p>` : ''}
                </div>
              </div>
              <span class="article-audio-badge text-[10px] px-2.5 py-1 rounded-full font-mono bg-indigo-500/10 text-indigo-500 font-semibold shrink-0">صوت / AUDIO</span>
            </div>
            <audio controls preload="metadata" class="article-audio-player w-full rounded-xl">
              <source src="${resolvedSrc}" type="${getAudioMimeType(resolvedSrc)}">
              مرورگر شما از پخش صوت پشتیبانی نمی‌کند. <a href="${resolvedSrc}" download class="text-indigo-500 underline text-xs">دانلود فایل صوتی</a>
            </audio>
          </div>`;
        }

        const caption = title || text;
        return `<figure class="article-figure my-6 text-center">
          <img src="${resolvedSrc}" alt="${escapeXml(text || 'تصویر مقاله')}" ${title ? `title="${escapeXml(title)}"` : ''} loading="lazy" class="article-img rounded-xl max-w-full mx-auto shadow-md" />
          ${caption ? `<figcaption class="article-figcaption text-xs mt-2 text-muted opacity-80 italic">${escapeXml(caption)}</figcaption>` : ''}
        </figure>`;
      },
    },
  });

  return instance;
}

// Converter LRU Cache to avoid redundant conversions
interface CacheEntry {
  key: string;
  result: {
    bodyHtml: string;
    toc: { id: string; text: string; level: number }[];
    wordCount: number;
    readTime: number;
  };
}
const CONVERTER_CACHE: CacheEntry[] = [];

// Main markdown to article HTML converter with fast caching
export function convertMarkdownToArticleHtml(
  markdown: string,
  metadata: ArticleMetadata,
  forStandalone = false,
  customUrlResolver?: (url: string) => string
): { bodyHtml: string; toc: { id: string; text: string; level: number }[]; wordCount: number; readTime: number } {
  // Only use cache if no custom resolver is active
  const cacheKey = !customUrlResolver
    ? `${markdown.length}_${markdown.slice(0, 40)}_${markdown.slice(-40)}_${metadata.direction}_${metadata.theme}_${forStandalone}`
    : null;

  if (cacheKey) {
    const existing = CONVERTER_CACHE.find((c) => c.key === cacheKey);
    if (existing) {
      return existing.result;
    }
  }

  // 0. Custom Snippets Replacement {{snippet_name}}
  let processedMd = markdown;
  if (metadata.snippets && metadata.snippets.length > 0) {
    metadata.snippets.forEach((snippet) => {
      if (snippet.name && snippet.content) {
        // Use a global regex to replace all occurrences of {{name}}
        const escapedName = snippet.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\{\\{${escapedName}\\}\\}`, 'g');
        processedMd = processedMd.replace(regex, snippet.content);
      }
    });
  }

  const { text: finalPreprocessedMd, mathMap } = preprocessMath(processedMd, forStandalone, customUrlResolver);

  currentTocCollector = [];
  currentIdCounts = new Map<string, number>();

  const markedInstance = getSharedMarkedInstance(forStandalone, customUrlResolver);
  const rawHtml = markedInstance.parse(finalPreprocessedMd) as string;
  let bodyHtml = postProcessHtml(rawHtml, mathMap);

  const resolveMediaUrl = (url: string): string => {
    if (customUrlResolver) return customUrlResolver(url);
    return forStandalone ? assetStore.resolveForStandaloneExport(url) : assetStore.resolveUrl(url);
  };

  // Replace all remaining media links with accurate resolved URLs
  bodyHtml = bodyHtml.replace(
    /src="([^"]+)"/g,
    (_, src) => `src="${resolveMediaUrl(src)}"`
  );

  bodyHtml = bodyHtml.replace(
    /<a href="([^"]+)" download/g,
    (_, href) => `<a href="${resolveMediaUrl(href)}" download`
  );

  const toc = [...currentTocCollector];
  const words = countWordsFast(markdown);
  const readTime = Math.max(1, Math.ceil(words / 180));

  const result = { bodyHtml, toc, wordCount: words, readTime };

  if (cacheKey) {
    if (CONVERTER_CACHE.length > 8) {
      CONVERTER_CACHE.shift();
    }
    CONVERTER_CACHE.push({ key: cacheKey, result });
  }

  return result;
}

// Generate Full Standalone HTML File code with embedded styles & optional minification/LZ-compression
export function generateStandaloneArticleHtml(
  markdown: string,
  metadata: ArticleMetadata,
  options?: StandaloneHtmlOptions
): string {
  const customUrlResolver = options?.assetUrlResolver;
  const { bodyHtml: rawBodyHtml, toc, wordCount, readTime } = convertMarkdownToArticleHtml(
    markdown,
    metadata,
    true,
    customUrlResolver
  );

  const resolveMediaUrl = (url: string): string => {
    if (customUrlResolver) return customUrlResolver(url);
    return assetStore.resolveForStandaloneExport(url);
  };

  // Convert any remaining Blob / Asset URLs to self-contained Base64 or resolved relative paths
  const bodyHtml = rawBodyHtml
    .replace(/src="([^"]+)"/g, (_, src) => `src="${resolveMediaUrl(src)}"`)
    .replace(/<a href="([^"]+)" download/g, (_, href) => `<a href="${resolveMediaUrl(href)}" download`);

  const displayTitle = metadata.title || (() => {
    const match = markdown.match(/^#\s+(.+)$/m);
    return match ? match[1].replace(/[*_~`]/g, '').trim() : '';
  })();

  const isRtl = metadata.direction === 'rtl' || metadata.direction === 'auto';
  const dir = isRtl ? 'rtl' : 'ltr';

  let tocHtml = '';
  if (metadata.showToc && toc.length > 0) {
    tocHtml = `
      <nav class="article-toc no-print shadow-xs">
        <h3 class="article-toc-title">
          <span>📋</span>
          <span>فهرست مطالب مقاله</span>
        </h3>
        <ul class="article-toc-list">
          ${toc
            .map(
              (item) => `
            <li class="article-toc-item level-${item.level}">
              <a href="#${item.id}" class="article-toc-link">
                ${item.text}
              </a>
            </li>
          `
            )
            .join('')}
        </ul>
      </nav>
    `;
  }

  const themeCss = getThemeCss(metadata.theme);

  const hasHeaderContent =
    displayTitle ||
    metadata.subtitle ||
    metadata.author ||
    metadata.affiliation ||
    metadata.date ||
    metadata.journal;

  const defaultMode = metadata.readingMode || 'auto';

  const fullHtml = `<!DOCTYPE html>
<html lang="${isRtl ? 'fa' : 'en'}" dir="${dir}" data-active-mode="${defaultMode === 'auto' ? 'day' : defaultMode}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeXml(displayTitle || 'مقاله HTML')}</title>
  <meta name="author" content="${escapeXml(metadata.author)}">
  <meta name="description" content="${escapeXml(metadata.abstract || metadata.subtitle)}">
  
  <!-- Premium Persian Font & JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  
  <!-- Math Formula CSS (KaTeX) -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  
  <style>
    *, ::before, ::after { box-sizing: border-box; }
    html { scroll-behavior: smooth; }

    /* Reading Mode Color Variables */
    :root, [data-active-mode="day"] {
      --bg-page: #f8fafc;
      --bg-card: #ffffff;
      --text-main: #0f172a;
      --text-muted: #475569;
      --border-color: #e2e8f0;
      --bg-accent: #f1f5f9;
      --color-primary: #4f46e5;
      --code-bg: #0f172a;
      --code-text: #f8fafc;
      --table-header-bg: #f1f5f9;
      --table-row-alt: #f8fafc;
    }

    [data-active-mode="night"] {
      --bg-page: #0b0f19;
      --bg-card: #151d2a;
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
      --border-color: #2a364f;
      --bg-accent: #1e293b;
      --color-primary: #818cf8;
      --code-bg: #0b0f19;
      --code-text: #f8fafc;
      --table-header-bg: #1e293b;
      --table-row-alt: #162136;
    }

    [data-active-mode="reading"] {
      --bg-page: #f5edd8;
      --bg-card: #fbf0d9;
      --text-main: #3b2d1d;
      --text-muted: #6b5742;
      --border-color: #e2d5bd;
      --bg-accent: #f3e3c3;
      --color-primary: #b45309;
      --code-bg: #2d2317;
      --code-text: #fbf0d9;
      --table-header-bg: #f3e3c3;
      --table-row-alt: #f8eed7;
    }

    body {
      margin: 0;
      padding: 0;
      background-color: var(--bg-page);
      color: var(--text-main);
      font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Tahoma, Arial, sans-serif;
      line-height: ${metadata.lineHeight || 1.85};
      font-size: ${metadata.fontSize || 16}px;
      -webkit-font-smoothing: antialiased;
      word-wrap: break-word;
      overflow-wrap: break-word;
      word-break: normal;
      transition: background-color 0.25s ease, color 0.25s ease;
    }
    
    .article-wrapper {
      width: 100%;
      max-width: 900px;
      margin: 36px auto;
      padding: 48px;
      background: var(--bg-card);
      border-radius: 16px;
      box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.07);
      border: 1px solid var(--border-color);
      transition: background-color 0.25s ease, border-color 0.25s ease;
    }

    @media (max-width: 768px) {
      .article-wrapper {
        margin: 12px auto;
        padding: 24px 18px;
        border-radius: 12px;
      }
    }

    .article-header {
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid var(--border-color);
    }
    .article-title {
      font-size: 2.2rem;
      font-weight: 800;
      line-height: 1.35;
      color: var(--text-main);
      margin: 0 0 12px 0;
    }
    .article-subtitle {
      font-size: 1.15rem;
      color: var(--text-muted);
      margin: 0 0 20px 0;
      font-weight: 400;
      line-height: 1.6;
    }
    .article-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 20px;
      font-size: 0.9rem;
      color: var(--text-muted);
      align-items: center;
      background: var(--bg-accent);
      padding: 12px 18px;
      border-radius: 10px;
    }
    .article-meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .article-abstract {
      background: var(--bg-accent);
      border-right: 4px solid var(--color-primary);
      border-radius: 8px;
      padding: 18px 22px;
      margin: 24px 0;
    }
    html[dir="ltr"] .article-abstract {
      border-right: none;
      border-left: 4px solid var(--color-primary);
    }
    .article-abstract-title {
      font-weight: 700;
      font-size: 1rem;
      color: var(--color-primary);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .article-body {
      width: 100%;
      max-width: 100%;
      overflow-wrap: break-word;
      word-wrap: break-word;
    }

    .article-body h1, .article-body h2, .article-body h3, .article-body h4 {
      color: var(--text-main);
      font-weight: 700;
      margin-top: 2em;
      margin-bottom: 0.7em;
      line-height: 1.4;
      scroll-margin-top: 32px;
    }
    .article-body h1 { font-size: 1.85rem; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; }
    .article-body h2 { font-size: 1.45rem; }
    .article-body h3 { font-size: 1.2rem; }

    .article-body p { margin: 1.25em 0; text-align: justify; text-justify: inter-word; color: var(--text-main); line-height: inherit; }
    .article-body a { color: var(--color-primary); text-decoration: underline; font-weight: 500; }
    
    .article-figure { margin: 32px 0; text-align: center; }
    .article-img {
      max-width: 100%;
      height: auto;
      border-radius: 12px;
      margin: 0 auto;
      display: block;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      border: 1px solid var(--border-color);
      cursor: zoom-in;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .article-img:hover {
      transform: scale(1.008);
      box-shadow: 0 8px 28px rgba(0,0,0,0.12);
    }
    .article-figcaption { margin-top: 10px; font-size: 0.85rem; color: var(--text-muted); font-style: italic; }

    /* Audio Player Card */
    .article-audio-box {
      margin: 28px 0;
      padding: 16px 20px;
      background: var(--bg-accent);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
      transition: border-color 0.2s ease;
    }
    .article-audio-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }
    .article-audio-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgba(79, 70, 229, 0.12);
      color: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      flex-shrink: 0;
    }
    .article-audio-info { flex: 1; min-width: 0; }
    .article-audio-title { font-weight: 700; font-size: 0.95rem; color: var(--text-main); margin: 0; }
    .article-audio-subtitle { font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; }
    .article-audio-badge {
      font-size: 0.72rem;
      padding: 3px 8px;
      border-radius: 20px;
      font-family: monospace;
      background: rgba(79, 70, 229, 0.1);
      color: var(--color-primary);
      font-weight: 600;
      white-space: nowrap;
    }
    .article-audio-player { width: 100%; height: 42px; border-radius: 10px; outline: none; }
    [data-active-mode="night"] .article-audio-icon { background: rgba(129, 140, 248, 0.2); }
    [data-active-mode="reading"] .article-audio-icon { background: rgba(180, 83, 9, 0.15); }
    
    .article-body ul, .article-body ol { padding-right: 24px; margin: 1em 0; color: var(--text-main); }
    html[dir="ltr"] .article-body ul, html[dir="ltr"] .article-body ol { padding-right: 0; padding-left: 24px; }
    .article-body li { margin-bottom: 0.4em; }

    .article-body blockquote {
      margin: 24px 0;
      padding: 14px 20px;
      background: var(--bg-accent);
      border-right: 4px solid var(--color-primary);
      border-radius: 0 8px 8px 0;
      font-style: italic;
      color: var(--text-muted);
    }
    html[dir="ltr"] .article-body blockquote {
      border-right: none;
      border-left: 4px solid var(--color-primary);
      border-radius: 8px 0 0 8px;
    }

    /* Table of Contents */
    .article-toc {
      background: var(--bg-accent);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
      margin: 28px 0;
    }
    .article-toc-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-main);
      margin: 0 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .article-toc-list { list-style: none; padding: 0; margin: 0; }
    .article-toc-item { margin-bottom: 6px; }
    .article-toc-item.level-2 { padding-right: 16px; }
    .article-toc-item.level-3 { padding-right: 32px; }
    html[dir="ltr"] .article-toc-item.level-2 { padding-right: 0; padding-left: 16px; }
    html[dir="ltr"] .article-toc-item.level-3 { padding-right: 0; padding-left: 32px; }
    .article-toc-link {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.92rem;
      transition: color 0.15s ease;
    }
    .article-toc-link:hover {
      color: var(--color-primary);
      text-decoration: underline;
    }

    /* Callout Boxes */
    .callout-box {
      margin: 22px 0;
      padding: 14px 18px;
      border-radius: 10px;
      border-right: 4px solid #3b82f6;
      background: #eff6ff;
      color: #1e3a8a;
    }
    html[dir="ltr"] .callout-box { border-right: none; border-left: 4px solid #3b82f6; }
    .callout-header { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.95rem; margin-bottom: 4px; }
    .callout-note { border-color: #3b82f6; background: #eff6ff; color: #1e3a8a; }
    .callout-warning { border-color: #f59e0b; background: #fffbeb; color: #78350f; }
    .callout-tip { border-color: #10b981; background: #ecfdf5; color: #064e3b; }
    .callout-important { border-color: #f43f5e; background: #fff1f2; color: #881337; }

    [data-active-mode="night"] .callout-note { background: #1e293b; color: #93c5fd; border-color: #60a5fa; }
    [data-active-mode="night"] .callout-warning { background: #271e11; color: #fcd34d; border-color: #fbbf24; }
    [data-active-mode="night"] .callout-tip { background: #062c24; color: #6ee7b7; border-color: #34d399; }
    [data-active-mode="night"] .callout-important { background: #2d121a; color: #fda4af; border-color: #f43f5e; }

    /* Tables */
    .article-table-wrapper {
      width: 100%;
      max-width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      margin: 28px 0;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      background: var(--bg-card);
    }
    .article-table {
      width: 100%;
      min-width: 480px;
      border-collapse: collapse;
    }
    .article-table th {
      padding: 12px 16px;
      background: var(--table-header-bg);
      color: var(--text-main);
      font-weight: 700;
      border-bottom: 2px solid var(--border-color);
    }
    .article-table td {
      padding: 10px 16px;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-main);
    }
    .article-table tr:nth-child(even) {
      background: var(--table-row-alt);
    }

    /* Code Blocks */
    .article-code-block {
      margin: 24px 0;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #334155;
      background: #0f172a;
      direction: ltr;
      text-align: left;
      max-width: 100%;
    }
    .article-code-block .bg-slate-800 {
      background: #1e293b;
      color: #94a3b8;
      padding: 8px 16px;
      font-size: 0.75rem;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #334155;
    }
    .article-code-block pre {
      margin: 0;
      padding: 16px;
      background: #0f172a;
      color: #f8fafc;
      overflow-x: auto;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      font-size: 0.9rem;
      line-height: 1.6;
    }
    :not(pre) > code {
      background: var(--bg-accent);
      color: var(--color-primary);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      font-size: 0.88em;
    }

    /* Embedded Highlight Syntax Colors */
    .hljs-keyword, .hljs-selector-tag, .hljs-subst { color: #f472b6; font-weight: 600; }
    .hljs-string, .hljs-title, .hljs-section, .hljs-attribute, .hljs-literal, .hljs-template-tag, .hljs-template-variable, .hljs-type, .hljs-addition { color: #34d399; }
    .hljs-comment, .hljs-quote, .hljs-deletion, .hljs-meta { color: #94a3b8; font-style: italic; }
    .hljs-number, .hljs-regexp, .hljs-link { color: #fbbf24; }
    .hljs-variable, .hljs-symbol, .hljs-bullet { color: #38bdf8; }
    .hljs-built_in, .hljs-code { color: #a78bfa; }
    .hljs-name, .hljs-tag { color: #f87171; }

    /* Math */
    .katex-block {
      margin: 24px 0;
      overflow-x: auto;
      max-width: 100%;
      text-align: center;
      direction: ltr;
      padding: 12px 0;
    }
    .katex-inline {
      direction: ltr;
      display: inline-block;
      padding: 0 4px;
    }

    /* Image Lightbox Modal */
    .article-lightbox {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(10, 15, 30, 0.92);
      z-index: 99999;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      padding: 24px;
      backdrop-filter: blur(8px);
      transition: all 0.25s ease;
    }
    .article-lightbox.active { display: flex; }
    .article-lightbox-topbar {
      position: absolute;
      top: 20px;
      right: 24px;
      left: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 100000;
      direction: rtl;
    }
    .article-lightbox-close-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(239, 68, 68, 0.2);
      color: #ffffff;
      border: 1px solid rgba(239, 68, 68, 0.4);
      padding: 8px 18px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      backdrop-filter: blur(6px);
      transition: all 0.2s ease;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    }
    .article-lightbox-close-btn:hover {
      background: rgba(239, 68, 68, 0.85);
      border-color: #ef4444;
      transform: translateY(-1px);
    }
    .article-lightbox-title {
      color: #94a3b8;
      font-size: 13px;
      font-weight: 500;
      max-width: 60%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .article-lightbox-img-wrap {
      max-width: 95vw;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: default;
    }
    .article-lightbox img {
      max-width: 94vw;
      max-height: 80vh;
      object-fit: contain;
      border-radius: 12px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .article-lightbox-caption {
      margin-top: 12px;
      color: #cbd5e1;
      font-size: 13px;
      text-align: center;
      max-width: 80vw;
    }
    .article-lightbox-hint {
      margin-top: 8px;
      font-size: 11px;
      color: #64748b;
      letter-spacing: 0.2px;
    }

    /* Floating Reading Mode Toolbar */
    .mode-switcher-bar {
      position: fixed;
      bottom: 24px;
      left: 24px;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 6px;
      background: #0f172a;
      padding: 6px 10px;
      border-radius: 9999px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
      border: 1px solid #334155;
      direction: rtl;
    }

    .mode-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      padding: 6px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-family: inherit;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .mode-btn:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.12);
    }

    .mode-btn.active {
      background: #4f46e5;
      color: #ffffff;
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(79, 70, 229, 0.4);
    }

    @media print {
      body { background: white !important; color: black !important; font-size: 12pt !important; line-height: 1.6 !important; }
      .article-wrapper { border: none !important; box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; padding: 0 !important; background: white !important; }
      .no-print, .mode-switcher-bar, .article-lightbox { display: none !important; }
      .article-img { break-inside: avoid; page-break-inside: avoid; max-height: 400px; }
      .article-table-wrapper { break-inside: avoid; page-break-inside: avoid; }
      .katex-block { break-inside: avoid; page-break-inside: avoid; }
    }

    ${themeCss}
  </style>
</head>
<body>
  <!-- Floating Reading Mode Switcher -->
  <div class="mode-switcher-bar no-print" id="mode-toolbar">
    <button class="mode-btn" onclick="switchMode('day')" id="btn-mode-day">☀️ روز</button>
    <button class="mode-btn" onclick="switchMode('night')" id="btn-mode-night">🌙 شب</button>
    <button class="mode-btn" onclick="switchMode('reading')" id="btn-mode-reading">📖 مطالعه</button>
    <button class="mode-btn" onclick="switchMode('auto')" id="btn-mode-auto">🔄 خودکار</button>
  </div>

  <!-- Image Zoom Lightbox Modal with dedicated Exit control -->
  <div class="article-lightbox no-print" id="article-lightbox" onclick="closeLightbox(event)">
    <div class="article-lightbox-topbar" onclick="event.stopPropagation()">
      <span class="article-lightbox-title" id="lightbox-title">بزرگ‌نمایی تصویر</span>
      <button class="article-lightbox-close-btn" onclick="closeLightbox(event)" title="خروج از بزرگ‌نمایی (Esc)">
        <span>✕</span>
        <span>بستن تصویر</span>
      </button>
    </div>
    <div class="article-lightbox-img-wrap" onclick="event.stopPropagation()">
      <img id="lightbox-img" src="" alt="Full view" />
      <div class="article-lightbox-caption" id="lightbox-caption"></div>
      <div class="article-lightbox-hint">برای بستن، کلیک کنید یا کلید Esc را بزنید</div>
    </div>
  </div>

  <article class="article-wrapper">
    ${
      metadata.showMetadata && hasHeaderContent
        ? `
    <header class="article-header">
      ${metadata.coverImage ? `<div class="article-cover-wrap mb-6 text-center"><img src="${resolveMediaUrl(metadata.coverImage)}" alt="${escapeXml(displayTitle || 'تصویر جلد')}" class="article-cover-img rounded-2xl max-w-full mx-auto shadow-lg max-h-96 object-cover border border-slate-700/40" /></div>` : ''}
      ${displayTitle ? `<h1 class="article-title">${escapeXml(displayTitle)}</h1>` : ''}
      ${metadata.subtitle ? `<div class="article-subtitle">${escapeXml(metadata.subtitle)}</div>` : ''}
      
      <div class="article-meta">
        ${metadata.author ? `<div class="article-meta-item"><span>✍️ نویسنده:</span> <strong>${escapeXml(metadata.author)}</strong></div>` : ''}
        ${metadata.affiliation ? `<div class="article-meta-item"><span>🏛️ مرکز/دانشگاه:</span> <span>${escapeXml(metadata.affiliation)}</span></div>` : ''}
        ${metadata.date ? `<div class="article-meta-item"><span>📅 تاریخ:</span> <span>${escapeXml(metadata.date)}</span></div>` : ''}
        ${metadata.journal ? `<div class="article-meta-item"><span>📰 انتشار:</span> <span>${escapeXml(metadata.journal)}</span></div>` : ''}
        <div class="article-meta-item"><span>⏱️ زمان مطالعه:</span> <span>حدود ${readTime} دقیقه (${wordCount} کلمه)</span></div>
      </div>
    </header>
    `
        : ''
    }

    ${
      metadata.abstract
        ? `
    <div class="article-abstract">
      <div class="article-abstract-title">📌 چکیده مقاله (Abstract)</div>
      <div style="line-height: 1.8; opacity: 0.9;">${escapeXml(metadata.abstract)}</div>
      ${metadata.keywords ? `<div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid var(--border-color); font-size: 0.8rem; opacity: 0.75;"><strong>کلمات کلیدی:</strong> ${escapeXml(metadata.keywords)}</div>` : ''}
    </div>
    `
        : ''
    }

    ${tocHtml}

    <main id="article-main" class="article-body">
      ${(() => {
        // Only run LZString if requested and body does not contain massive base64 media
        const isSafeForLz = options?.compressLz && bodyHtml.length < 500000 && !bodyHtml.includes('data:audio/') && !bodyHtml.includes('data:image/');
        if (isSafeForLz) {
          try {
            return `<script id="article-payload-lz" type="text/plain">${LZString.compressToBase64(bodyHtml)}</script>
              <noscript>${bodyHtml}</noscript>`;
          } catch {
            return bodyHtml;
          }
        }
        return bodyHtml;
      })()}
    </main>

    ${
      metadata.author || metadata.journal
        ? `
    <footer style="margin-top: 64px; padding-top: 32px; border-top: 1px solid var(--border-color); text-align: center; font-size: 0.8rem; opacity: 0.7;" class="no-print">
      طراحی شده با مبدل مارک‌داون به مقاله HTML &bull; ${escapeXml(metadata.journal || metadata.author || '')}
    </footer>
    `
        : ''
    }
  </article>

  <script>
    (function() {
      // 0. Micro LZ-String Decompressor for Compressed Articles
      var _LZ = (function() {
        var k = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        var f = String.fromCharCode;
        return {
          decompressFromBase64: function(input) {
            if (!input) return "";
            var dict = [], next, enlargeIn = 4, dictSize = 4, numBits = 3,
                entry = "", result = [], i, w, bits, resb, maxpower, power,
                c, data = { val: k.indexOf(input.charAt(0)), position: 32, index: 1 };
            for (i = 0; i < 3; i += 1) { dict[i] = i; }
            bits = 0; maxpower = Math.pow(2, 2); power = 1;
            while (power != maxpower) {
              resb = data.val & data.position;
              data.position >>= 1;
              if (data.position == 0) {
                data.position = 32;
                data.val = k.indexOf(input.charAt(data.index++));
              }
              bits |= (resb > 0 ? 1 : 0) * power;
              power <<= 1;
            }
            switch (next = bits) {
              case 0:
                bits = 0; maxpower = Math.pow(2, 8); power = 1;
                while (power != maxpower) {
                  resb = data.val & data.position;
                  data.position >>= 1;
                  if (data.position == 0) {
                    data.position = 32;
                    data.val = k.indexOf(input.charAt(data.index++));
                  }
                  bits |= (resb > 0 ? 1 : 0) * power;
                  power <<= 1;
                }
                c = f(bits);
                break;
              case 1:
                bits = 0; maxpower = Math.pow(2, 16); power = 1;
                while (power != maxpower) {
                  resb = data.val & data.position;
                  data.position >>= 1;
                  if (data.position == 0) {
                    data.position = 32;
                    data.val = k.indexOf(input.charAt(data.index++));
                  }
                  bits |= (resb > 0 ? 1 : 0) * power;
                  power <<= 1;
                }
                c = f(bits);
                break;
              case 2:
                return "";
            }
            dict[3] = c;
            w = c;
            result.push(c);
            while (true) {
              if (data.index > input.length) { return ""; }
              bits = 0; maxpower = Math.pow(2, numBits); power = 1;
              while (power != maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                  data.position = 32;
                  data.val = k.indexOf(input.charAt(data.index++));
                }
                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
              }
              switch (c = bits) {
                case 0:
                  bits = 0; maxpower = Math.pow(2, 8); power = 1;
                  while (power != maxpower) {
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position == 0) {
                      data.position = 32;
                      data.val = k.indexOf(input.charAt(data.index++));
                    }
                    bits |= (resb > 0 ? 1 : 0) * power;
                    power <<= 1;
                  }
                  dict[dictSize++] = f(bits);
                  c = dictSize - 1;
                  enlargeIn--;
                  break;
                case 1:
                  bits = 0; maxpower = Math.pow(2, 16); power = 1;
                  while (power != maxpower) {
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position == 0) {
                      data.position = 32;
                      data.val = k.indexOf(input.charAt(data.index++));
                    }
                    bits |= (resb > 0 ? 1 : 0) * power;
                    power <<= 1;
                  }
                  dict[dictSize++] = f(bits);
                  c = dictSize - 1;
                  enlargeIn--;
                  break;
                case 2:
                  return result.join("");
              }
              if (enlargeIn == 0) {
                enlargeIn = Math.pow(2, numBits);
                numBits++;
              }
              if (dict[c]) {
                entry = dict[c];
              } else {
                if (c === dictSize) {
                  entry = w + w.charAt(0);
                } else {
                  return null;
                }
              }
              result.push(entry);
              dict[dictSize++] = w + entry.charAt(0);
              enlargeIn--;
              w = entry;
              if (enlargeIn == 0) {
                enlargeIn = Math.pow(2, numBits);
                numBits++;
              }
            }
          }
        };
      })();

      // Unpack LZ-compressed payload if present
      var payloadEl = document.getElementById('article-payload-lz');
      var mainEl = document.getElementById('article-main');
      if (payloadEl && mainEl) {
        var rawText = (payloadEl.textContent || '').trim();
        if (rawText) {
          try {
            var decomp = _LZ.decompressFromBase64(rawText);
            if (decomp) {
              mainEl.innerHTML = decomp;
            }
          } catch (err) {
            console.warn('Decompression error, using fallback:', err);
          }
        }
      }

      // 1. Reading Mode Management
      var storedMode = localStorage.getItem('article_reading_mode') || '${defaultMode}';
      
      function getSystemAutoMode() {
        var hour = new Date().getHours();
        var isDarkSys = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return (isDarkSys || hour >= 19 || hour < 7) ? 'night' : 'day';
      }

      function applyMode(mode) {
        var resolvedMode = mode === 'auto' ? getSystemAutoMode() : mode;
        document.documentElement.setAttribute('data-active-mode', resolvedMode);
        document.body.setAttribute('data-active-mode', resolvedMode);
        
        ['day', 'night', 'reading', 'auto'].forEach(function(m) {
          var btn = document.getElementById('btn-mode-' + m);
          if (btn) {
            if (m === mode) {
              btn.classList.add('active');
            } else {
              btn.classList.remove('active');
            }
          }
        });
      }

      window.switchMode = function(mode) {
        localStorage.setItem('article_reading_mode', mode);
        applyMode(mode);
      };

      applyMode(storedMode);

      // 2. Lightbox Zoom for Article Images with Full Exit Control
      var lightbox = document.getElementById('article-lightbox');
      var lightboxImg = document.getElementById('lightbox-img');
      var lightboxCaption = document.getElementById('lightbox-caption');
      var lightboxTitle = document.getElementById('lightbox-title');
      
      function bindImages() {
        document.querySelectorAll('.article-img').forEach(function(img) {
          img.addEventListener('click', function(e) {
            e.stopPropagation();
            if (lightbox && lightboxImg) {
              lightboxImg.src = img.src;
              var captionText = img.getAttribute('title') || img.getAttribute('alt') || '';
              if (lightboxCaption) {
                lightboxCaption.textContent = captionText;
                lightboxCaption.style.display = captionText ? 'block' : 'none';
              }
              if (lightboxTitle) {
                lightboxTitle.textContent = captionText || 'بزرگ‌نمایی تصویر';
              }
              lightbox.classList.add('active');
              document.body.style.overflow = 'hidden';
            }
          });
        });
      }
      bindImages();

      window.closeLightbox = function(e) {
        if (e && e.stopPropagation) {
          e.stopPropagation();
        }
        if (lightbox) {
          lightbox.classList.remove('active');
          document.body.style.overflow = '';
        }
      };

      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          closeLightbox();
        }
      });
    })();
  </script>
</body>
</html>`;

  if (options?.minify) {
    return minifyHtml(fullHtml);
  }

  return fullHtml;
}

// Minify HTML code to drastically reduce size while preserving pre/code blocks and scripts safely
export function minifyHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  try {
    // If the HTML is extremely large (e.g. contains massive base64 media data), avoid catastrophic regex backtracking
    if (html.length > 800000) {
      return html.trim();
    }

    // 1. Guard <pre>, <code>, <script>, and <style> blocks
    const preservedBlocks: string[] = [];
    const withGuards = html.replace(
      /(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>|<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>)/gi,
      (match) => {
        const placeholder = `___PRESERVED_BLOCK_${preservedBlocks.length}___`;
        preservedBlocks.push(match);
        return placeholder;
      }
    );

    // 2. Strip HTML comments (except conditionals)
    let minified = withGuards.replace(/<!--[\s\S]*?-->/g, '');

    // 3. Compress spaces between HTML tags
    minified = minified.replace(/>\s+</g, '><');
    minified = minified.replace(/[ \t]{2,}/g, ' ');

    // 4. Restore preserved blocks safely using replacement function
    minified = minified.replace(/___PRESERVED_BLOCK_(\d+)___/g, (_, idx) => {
      const block = preservedBlocks[Number(idx)];
      return block !== undefined ? block : '';
    });

    return minified.trim();
  } catch (err) {
    console.warn('minifyHtml fallback:', err);
    return html;
  }
}

function getThemeCss(theme: ArticleTheme): string {
  switch (theme) {
    case 'academic':
      return `
        .article-wrapper { border-top: 6px solid var(--color-primary); }
        .article-title { color: var(--color-primary); text-align: center; }
        .article-subtitle { text-align: center; font-style: italic; }
        .article-meta { justify-content: center; }
        .article-body h1, .article-body h2 { color: var(--color-primary); border-bottom: 2px double var(--border-color); }
      `;
    case 'journalistic':
      return `
        .article-wrapper { border-radius: 6px; border-top: 8px solid #b91c1c; }
        .article-title { font-size: 2.5rem; font-weight: 900; }
        .article-subtitle { font-size: 1.25rem; font-weight: 500; }
        .article-abstract { border-right-color: #ef4444; }
        html[dir="ltr"] .article-abstract { border-left-color: #ef4444; }
      `;
    case 'technical':
      return `
        .article-wrapper { border-right: 6px solid #0284c7; }
        html[dir="ltr"] .article-wrapper { border-right: none; border-left: 6px solid #0284c7; }
        .article-title { color: #0284c7; }
      `;
    case 'classic':
      return `
        .article-wrapper { border-color: var(--border-color); }
        .article-title { text-align: center; }
      `;
    case 'minimalist':
    default:
      return `
        .article-wrapper { max-width: 820px; border: 1px solid var(--border-color); }
        .article-title { font-weight: 800; }
      `;
  }
}

function escapeXml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const SAMPLE_MARKDOWNS = {
  academic: [
    '# بررسی جامع شبکه های عصبی عمیق در پردازش زبان طبیعی',
    '',
    'یک مطالعه مرور تحلیلی بر روی معماری ترنسفورمرها و هوش مصنوعی مولد در زبان‌های کم‌منبع.',
    '',
    '!audio[پادکست صوتی مقاله | روایت صوتی خلاصه تحقیق و یافته‌ها](https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3)',
    '',
    '## ۱. مقدمه و پیشینه تحقیق',
    '',
    'در سال‌های اخیر، پیشرفت‌های شگرفی در حوزه **پردازش زبان طبیعی (NLP)** و **یادگیری عمیق** به دست آمده است. ظهور مدل‌های مبتنی بر معماری *Transformer* تحولی بنیادین در فهم متون زبانی ایجاد کرده است.',
    '',
    '![معماری ترنسفورمر و مکانیزم توجه چندسره](https://images.unsplash.com/photo-1677442136019-21780efad99a?w=900&auto=format&fit=crop&q=80 "شکل ۱: ساختار مدل‌های زبانی بزرگ و جریان داده‌ها")',
    '',
    '$$E = mc^2 \\quad \\text{and} \\quad \\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$',
    '',
    '> [!NOTE]',
    '> استفاده از مکانیزم **توجه متقابل (Self-Attention)** امکان پردازش موازی کلمات را فراهم کرده است.',
    '',
    '## ۲. روش‌شناسی و فرمول‌بندی ریاضی',
    '',
    'معادله تابع هزینه و بهینه‌سازی پارامترها به صورت زیر تعریف می‌شود:',
    '',
    '$$\\mathcal{L}(\\theta) = -\\frac{1}{N} \\sum_{i=1}^{N} \\left[ y_i \\log(\\hat{y}_i) + (1 - y_i) \\log(1 - \\hat{y}_i) \\right]$$',
    '',
    '### ۲.۱. مقایسه کارایی الگوریتم‌ها',
    '',
    '| الگوریتم | دقت (Accuracy) | سرعت (Tokens/s) | حافظه مصرفی |',
    '| :--- | :---: | :---: | :---: |',
    '| Transformer Base | ۹۴.۲٪ | ۱۲۵۰ | ۴.۲ گیگابایت |',
    '| Flash Attention | ۹۶.۸٪ | ۳۴۰۰ | ۱.۸ گیگابایت |',
    '| Quantized LLaMA | ۹۲.۱٪ | ۴۸۰۰ | ۰.۹ گیگابایت |',
    '',
    '```python',
    '# نمونه کد پایتون جهت محاسبه خود-توجه (Self-Attention)',
    'import torch',
    'import torch.nn.functional as F',
    '',
    'def scaled_dot_product_attention(query, key, value):',
    '    d_k = query.size(-1)',
    '    scores = torch.matmul(query, key.transpose(-2, -1)) / torch.sqrt(torch.tensor(d_k))',
    '    p_attn = F.softmax(scores, dim=-1)',
    '    return torch.matmul(p_attn, value), p_attn',
    '```',
    '',
    '## ۳. نتیجه‌گیری',
    'نتایج نشان می‌دهد مدل‌های فشرده‌سازی شده با حفظ ۹۵٪ دقت، مصرف انرژی را تا ۶۰٪ کاهش می‌دهند.',
  ].join('\n'),

  journalistic: [
    '# انقلاب هوش مصنوعی در سال ۲۰۲۶: آینده پردازش ابری و توسعه نرم‌افزار',
    '',
    'گزارش اختصاصی از جدیدترین تحولات فناوری و تأثیرات آن بر اکوسیستم برنامه‌نویسی.',
    '',
    '!audio[گزارش صوتی اختصاصی | گفت‌وگو با پژوهشگران حوزه هوش مصنوعی](https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3)',
    '',
    '---',
    '',
    'امروزه هوش مصنوعی از یک ابزار کمکی به **هسته مرکزی توسعه نرم‌افزار** تبدیل شده است. میلیون‌ها برنامه‌نویس در سراسر جهان از دستیارهای هوشمند برای نگارش کد استفاده می‌کنند.',
    '',
    '> [!TIP]',
    '> برنامه‌نویسان پیشرو بیش از ۶۰ درصد زمان خود را به جای کدنویسی تکراری، صرف طراحی معماری سیستم می‌کنند.',
    '',
    '### کلیدی‌ترین شاخص‌های رشد:',
    '1. افزایش ۳۰۰ درصدی بهره‌وری در تیم‌های کوچک',
    '2. کاهش چشمگیر باگ‌های امنیتی با بررسی هوشمند',
    '3. توسعه همزمان برنامه‌های چندپلتفرمی',
    '',
    '![محیط توسعه مدرن نرم‌افزار](https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=900&auto=format&fit=crop&q=80 "تصویر ۱: اکوسیستم مدرن برنامه‌نویسی و ابزارهای توسعه")',
    '',
    '> "سرعت یادگیری و انطباق پذیری، مهم‌ترین مهارت مهندسان نرم‌افزار در عصر جدید است."',
  ].join('\n'),

  technical: [
    '# راهنمای پیکربندی و استقرار Microservices با Docker و Kubernetes',
    '',
    'مستندات فنی جهت راه‌اندازی سرویس‌های مقیاس‌پذیر.',
    '',
    '## پیش‌نیازها',
    '* نصب بودن Docker نسخه ۲۴ به بالا',
    '* دسترسی به کلاستر Kubernetes',
    '* ابزار `kubectl` و `helm`',
    '',
    '> [!WARNING]',
    '> قبل از اجرای دستورات زیر مطمئن شوید فایل `.env.production` تنظیم شده باشد.',
    '',
    '### مرحله اول: ساخت ایمیج داکر',
    '',
    '```bash',
    '# Build production image',
    'docker build -t app-service:v1.2.0 .',
    'docker tag app-service:v1.2.0 registry.example.com/app:v1.2.0',
    'docker push registry.example.com/app:v1.2.0',
    '```',
    '',
    '### تنظیمات Deployment در کوبرنتیس',
    '',
    '```yaml',
    'apiVersion: apps/v1',
    'kind: Deployment',
    'metadata:',
    '  name: article-converter-service',
    'spec:',
    '  replicas: 3',
    '  selector:',
    '    matchLabels:',
    '      app: converter',
    '  template:',
    '    metadata:',
    '      labels:',
    '        app: converter',
    '    spec:',
    '      containers:',
    '      - name: web',
    '        image: registry.example.com/app:v1.2.0',
    '        ports:',
    '        - containerPort: 3000',
    '```',
  ].join('\n'),
};
