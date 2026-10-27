import JSZip from 'jszip';
import { ArticleMetadata, DEFAULT_METADATA } from './markdown-converter';
import { MediaAsset, assetStore, dataUrlToUint8Array } from './asset-store';

export interface ProjectDraftAsset {
  id: string;
  name: string;
  type: 'image' | 'audio';
  mimeType: string;
  size: number;
  dataUrl: string;
  relativePath: string;
}

export interface ProjectDraft {
  format: 'md-article-project';
  version: 1;
  savedAt: string;
  metadata: ArticleMetadata;
  markdown: string;
  assets: ProjectDraftAsset[];
}

/**
 * Exports the current article draft, metadata, and only active media assets
 * into a single portable project file (*.mdpress / *.json).
 */
export async function exportProjectDraft(
  markdown: string,
  metadata: ArticleMetadata
): Promise<{ blob: Blob; fileName: string; assetCount: number }> {
  // Collect ONLY assets actually used in the article
  const activeAssets = assetStore.getActiveAssets(markdown, metadata.coverImage);

  const serializedAssets: ProjectDraftAsset[] = activeAssets.map((asset) => {
    return {
      id: asset.id,
      name: asset.name,
      type: asset.type,
      mimeType: asset.mimeType,
      size: asset.size,
      dataUrl: asset.dataUrl,
      relativePath: asset.relativePath || `./assets/${asset.name}`,
    };
  });

  const draft: ProjectDraft = {
    format: 'md-article-project',
    version: 1,
    savedAt: new Date().toISOString(),
    metadata,
    markdown,
    assets: serializedAssets,
  };

  const jsonStr = JSON.stringify(draft, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });

  const rawTitle = metadata.title || 'article_project';
  const cleanTitle = rawTitle
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 50);

  const fileName = `${cleanTitle || 'article'}_draft.mdpress`;

  return { blob, fileName, assetCount: serializedAssets.length };
}

/**
 * Imports a project draft (*.mdpress, *.json, or *.zip) and restores
 * the markdown text, article metadata, and all media assets into the assetStore.
 */
export async function importProjectDraft(
  file: File
): Promise<{ markdown: string; metadata: ArticleMetadata; assetCount: number }> {
  const fileName = file.name.toLowerCase();

  // 1. Handle ZIP package import (from a previous export or backup)
  if (fileName.endsWith('.zip')) {
    return await importProjectFromZip(file);
  }

  // 2. Handle JSON / MDPRESS project file
  const text = await file.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('فایل انتخاب شده ساختار معتبر JSON یا پروژه ندارد.');
  }

  // Check if it's a valid project draft or legacy state
  let markdown = '';
  let metadata: ArticleMetadata = { ...DEFAULT_METADATA };
  let assets: ProjectDraftAsset[] = [];

  if (data.format === 'md-article-project' || (data.markdown !== undefined && data.metadata)) {
    markdown = typeof data.markdown === 'string' ? data.markdown : '';
    if (data.metadata && typeof data.metadata === 'object') {
      metadata = { ...DEFAULT_METADATA, ...data.metadata };
    }
    if (Array.isArray(data.assets)) {
      assets = data.assets;
    }
  } else if (typeof data.content === 'string') {
    // Alternate format fallback
    markdown = data.content;
    if (data.metadata) metadata = { ...DEFAULT_METADATA, ...data.metadata };
    if (Array.isArray(data.assets)) assets = data.assets;
  } else {
    throw new Error('فرمت فایل پروژه نامعتبر یا ناشناخته است.');
  }

  // Register all included assets into the global assetStore
  let registeredCount = 0;
  for (const item of assets) {
    if (item && item.dataUrl) {
      const parsed = dataUrlToUint8Array(item.dataUrl);
      const blob = new Blob([parsed.data as BlobPart], { type: item.mimeType || parsed.mimeType });
      const objectUrl = URL.createObjectURL(blob);

      const asset: MediaAsset = {
        id: item.id || `asset_${item.type || 'media'}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: item.name,
        type: item.type || (item.mimeType?.startsWith('audio/') ? 'audio' : 'image'),
        mimeType: item.mimeType || parsed.mimeType,
        size: item.size || parsed.data.length,
        objectUrl,
        dataUrl: item.dataUrl,
        relativePath: item.relativePath || `./assets/${item.name}`,
        associatedPaths: [
          item.relativePath,
          item.name,
          `assets/${item.name}`,
          `./assets/${item.name}`,
          objectUrl,
        ].filter(Boolean) as string[],
      };

      assetStore.registerAsset(asset);
      registeredCount++;
    }
  }

  return {
    markdown,
    metadata,
    assetCount: registeredCount,
  };
}

/**
 * Helper to import directly from a ZIP file containing assets and html/md
 */
async function importProjectFromZip(
  file: File
): Promise<{ markdown: string; metadata: ArticleMetadata; assetCount: number }> {
  const zip = await JSZip.loadAsync(file);

  // Check if zip has project.mdpress or project.json
  const projectFile = zip.file('project.mdpress') || zip.file('project.json');
  if (projectFile) {
    const text = await projectFile.async('text');
    const dummyBlob = new Blob([text], { type: 'application/json' });
    const dummyFile = new File([dummyBlob], 'project.mdpress', { type: 'application/json' });
    return importProjectDraft(dummyFile);
  }

  // Check for article.md or README.md or any .md file
  let markdown = '';
  let metadata: ArticleMetadata = { ...DEFAULT_METADATA };
  let assetCount = 0;

  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (!zipEntry.dir && path.endsWith('.md')) {
      markdown = await zipEntry.async('text');
      break;
    }
  }

  // If no markdown file found, check index.html
  if (!markdown) {
    const htmlFile = zip.file('index.html');
    if (htmlFile) {
      // Create minimal markdown indicating HTML article restored
      markdown = '# مقاله وارد شده از بسته ZIP\n\nفایل‌های صوتی و تصویری با موفقیت در مخزن پروژه بارگذاری شدند.';
    }
  }

  // Extract all assets in assets/ folder
  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (!zipEntry.dir && path.startsWith('assets/')) {
      const fileName = path.replace(/^assets\//, '');
      if (fileName) {
        const u8 = await zipEntry.async('uint8array');
        const isAudio = /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(fileName);
        const mimeType = isAudio ? 'audio/mpeg' : 'image/png';
        const blob = new Blob([u8 as BlobPart], { type: mimeType });
        await assetStore.registerBlob(blob, fileName, isAudio ? 'audio' : 'image');
        assetCount++;
      }
    }
  }

  return { markdown, metadata, assetCount };
}
