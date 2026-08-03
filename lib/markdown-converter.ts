import { Marked } from 'marked';
import hljs from 'highlight.js';
import katex from 'katex';
import 'katex/dist/contrib/mhchem.js';

export type ArticleTheme = 'academic' | 'journalistic' | 'minimalist' | 'technical' | 'classic';
export type ReadingMode = 'auto' | 'day' | 'night' | 'reading';

export interface ArticleMetadata {
  title: string;
  subtitle: string;
  author: string;
  affiliation: string;
  date: string;
  journal: string;
  abstract: string;
  keywords: string;
  direction: 'rtl' | 'ltr' | 'auto';
  showToc: boolean;
  showMetadata: boolean;
  theme: ArticleTheme;
  readingMode?: ReadingMode;
  fontSize?: number;
  lineHeight?: number;
}

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

// Convert math expressions before marked parsing to protect math symbols
function preprocessMath(markdown: string): { text: string; mathMap: Map<string, string> } {
  const mathMap = new Map<string, string>();
  let count = 0;

  let text = markdown;

  // 1. Latex Environment Blocks (\begin{equation}...\end{equation}, \begin{align}...\end{align}, etc.)
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

  // 2. Block Math $$...$$
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

  // 3. Inline Math $...$
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

  return result;
}

// Main markdown to article HTML converter
export function convertMarkdownToArticleHtml(
  markdown: string,
  metadata: ArticleMetadata
): { bodyHtml: string; toc: { id: string; text: string; level: number }[]; wordCount: number; readTime: number } {
  const { text: processedMd, mathMap } = preprocessMath(markdown);

  const toc: { id: string; text: string; level: number }[] = [];
  const idCounts = new Map<string, number>();

  const markedInstance = new Marked({
    async: false,
    gfm: true,
    breaks: true,
  });

  markedInstance.use({
    renderer: {
      heading(token: any) {
        const text = this.parser.parseInline(token.tokens);
        const depth = token.depth;
        const plainText = text.replace(/<[^>]*>?/gm, '').trim();
        const baseSlug = plainText
          .toLowerCase()
          .replace(/[^\w\u0600-\u06FF]+/g, '-')
          .replace(/^-+|-+$/g, '');

        const slug = baseSlug || `section-${toc.length + 1}`;
        const count = idCounts.get(slug) || 0;
        idCounts.set(slug, count + 1);
        const id = count === 0 ? slug : `${slug}-${count + 1}`;

        if (depth <= 3) {
          toc.push({ id, text: plainText || 'بخش بدون عنوان', level: depth });
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
        } else {
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

        return `<div class="my-6 overflow-x-auto rounded-xl border shadow-xs transition-colors">
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
    },
  });

  const rawHtml = markedInstance.parse(processedMd) as string;
  const bodyHtml = postProcessHtml(rawHtml, mathMap);

  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(words / 180));

  return { bodyHtml, toc, wordCount: words, readTime };
}

// Generate Full Standalone HTML File code with embedded styles
export function generateStandaloneArticleHtml(
  markdown: string,
  metadata: ArticleMetadata
): string {
  const { bodyHtml, toc, wordCount, readTime } = convertMarkdownToArticleHtml(markdown, metadata);

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

  return `<!DOCTYPE html>
<html lang="${isRtl ? 'fa' : 'en'}" dir="${dir}" data-active-mode="${defaultMode === 'auto' ? 'day' : defaultMode}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeXml(displayTitle || 'مقاله HTML')}</title>
  <meta name="author" content="${escapeXml(metadata.author)}">
  <meta name="description" content="${escapeXml(metadata.abstract || metadata.subtitle)}">
  
  <!-- Math Formula CSS (Only external allowed link) -->
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
      line-height: ${metadata.lineHeight || 1.8};
      font-size: ${metadata.fontSize || 16}px;
      -webkit-font-smoothing: antialiased;
      transition: background-color 0.25s ease, color 0.25s ease;
    }
    
    .article-wrapper {
      max-width: 860px;
      margin: 32px auto;
      padding: 40px;
      background: var(--bg-card);
      border-radius: 16px;
      box-shadow: 0 8px 25px -4px rgba(0, 0, 0, 0.06);
      border: 1px solid var(--border-color);
      transition: background-color 0.25s ease, border-color 0.25s ease;
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

    .article-body h1, .article-body h2, .article-body h3, .article-body h4 {
      color: var(--text-main);
      font-weight: 700;
      margin-top: 1.8em;
      margin-bottom: 0.6em;
      line-height: 1.35;
    }
    .article-body h1 { font-size: 1.8rem; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; }
    .article-body h2 { font-size: 1.45rem; }
    .article-body h3 { font-size: 1.2rem; }

    .article-body p { margin: 1.2em 0; text-align: justify; color: var(--text-main); }
    .article-body a { color: var(--color-primary); text-decoration: underline; font-weight: 500; }
    .article-body img { max-width: 100%; height: auto; border-radius: 10px; margin: 24px auto; display: block; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .article-body ul, .article-body ol { padding-right: 24px; margin: 1em 0; color: var(--text-main); }
    html[dir="ltr"] .article-body ul, html[dir="ltr"] .article-body ol { padding-right: 0; padding-left: 24px; }
    .article-body li { margin-bottom: 0.4em; }

    .article-body blockquote {
      margin: 24px 0;
      padding: 12px 20px;
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
      margin: 20px 0;
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
    .article-table {
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
      background: var(--bg-card);
    }
    .article-table th {
      padding: 10px 14px;
      background: var(--table-header-bg);
      color: var(--text-main);
      font-weight: 700;
      border: 1px solid var(--border-color);
    }
    .article-table td {
      padding: 8px 14px;
      border: 1px solid var(--border-color);
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
      text-align: center;
      direction: ltr;
      padding: 12px 0;
    }
    .katex-inline {
      direction: ltr;
      display: inline-block;
      padding: 0 4px;
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
      body { background: white !important; color: black !important; }
      .article-wrapper { border: none !important; box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; padding: 0 !important; background: white !important; }
      .no-print, .mode-switcher-bar { display: none !important; }
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

  <article class="article-wrapper">
    ${
      metadata.showMetadata && hasHeaderContent
        ? `
    <header class="article-header">
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

    <main class="article-body">
      ${bodyHtml}
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
    })();
  </script>
</body>
</html>`;
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
    '## ۱. مقدمه و پیشینه تحقیق',
    '',
    'در سال‌های اخیر، پیشرفت‌های شگرفی در حوزه **پردازش زبان طبیعی (NLP)** و **یادگیری عمیق** به دست آمده است. ظهور مدل‌های مبتنی بر معماری *Transformer* تحولی بنیادین در فهم متون زبانی ایجاد کرده است.',
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
    '![تصویر نمونه](https://picsum.photos/seed/techjournal/800/400)',
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
