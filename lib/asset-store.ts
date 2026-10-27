// Global in-memory and IndexedDB asset store for media (images and audio)
// Keeps the editor lightning fast while guaranteeing 100% offline standalone HTML exports with embedded audio and images.

export interface MediaAsset {
  id: string;
  name: string;
  type: 'image' | 'audio';
  mimeType: string;
  size: number;
  objectUrl: string;
  dataUrl: string; // Base64 data URL for standalone exports
  relativePath?: string; // Standard relative path, e.g. ./assets/sample.mp3
  associatedPaths?: string[];
}

const DB_NAME = 'MarkdownArticle_AssetDB';
const STORE_NAME = 'media_assets';

// Helper to sanitize filenames for safe filesystem and cross-platform usage
export function sanitizeAssetFilename(rawName: string, defaultExt = 'png'): string {
  if (!rawName) return `asset_${Date.now()}.${defaultExt}`;
  
  // Extract extension
  const lastDot = rawName.lastIndexOf('.');
  let ext = lastDot !== -1 ? rawName.substring(lastDot + 1).toLowerCase().trim() : defaultExt;
  let baseName = lastDot !== -1 ? rawName.substring(0, lastDot) : rawName;

  // Clean baseName of unsafe filesystem characters while keeping Persian/Arabic/English letters
  let safeBase = baseName
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '-')
    .replace(/_+/g, '_')
    .slice(0, 40);

  if (!safeBase) {
    safeBase = `asset_${Date.now().toString(36)}`;
  }

  return `${safeBase}.${ext}`;
}

class MediaAssetStore {
  private memoryAssets = new Map<string, MediaAsset>();
  private isDbReady = false;
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      this.initDb();
    }
  }

  private async initDb(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;
    if (typeof window === 'undefined' || !('indexedDB' in window)) return null;

    this.dbPromise = new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, 2);
        request.onupgradeneeded = (e: any) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
        request.onsuccess = (e: any) => {
          const db = e.target.result;
          this.isDbReady = true;
          this.loadAllFromDb(db);
          resolve(db);
        };
        request.onerror = () => {
          this.isDbReady = false;
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  private async loadAllFromDb(db: IDBDatabase) {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result as MediaAsset[];
        if (items && Array.isArray(items)) {
          for (const item of items) {
            // Re-create live object URL from data URL
            if (item.dataUrl) {
              item.objectUrl = this.dataUrlToObjectUrl(item.dataUrl, item.mimeType);
            }
            this.indexAsset(item);
          }
        }
      };
    } catch {
      // Ignore IndexedDB read errors
    }
  }

  private indexAsset(asset: MediaAsset) {
    if (asset.id) this.memoryAssets.set(asset.id, asset);
    if (asset.name) this.memoryAssets.set(asset.name, asset);
    if (asset.objectUrl) this.memoryAssets.set(asset.objectUrl, asset);
    if (asset.dataUrl) this.memoryAssets.set(asset.dataUrl, asset);

    if (asset.relativePath) {
      this.memoryAssets.set(asset.relativePath, asset);
      const barePath = asset.relativePath.replace(/^\.\//, '');
      this.memoryAssets.set(barePath, asset);
      this.memoryAssets.set(`/${barePath}`, asset);
    } else if (asset.name) {
      this.memoryAssets.set(`./assets/${asset.name}`, asset);
      this.memoryAssets.set(`assets/${asset.name}`, asset);
      this.memoryAssets.set(`/assets/${asset.name}`, asset);
    }

    if (asset.associatedPaths && Array.isArray(asset.associatedPaths)) {
      for (const p of asset.associatedPaths) {
        if (p && typeof p === 'string') {
          this.memoryAssets.set(p, asset);
        }
      }
    }
  }

  private dataUrlToObjectUrl(dataUrl: string, fallbackMime: string): string {
    try {
      const arr = dataUrl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : fallbackMime;
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      return URL.createObjectURL(blob);
    } catch {
      return dataUrl;
    }
  }

  // Register a file/blob as an asset with immediate DataURL promise, ObjectURL, and relative path
  async registerBlob(
    blob: Blob,
    originalName: string,
    type: 'image' | 'audio'
  ): Promise<{ id: string; objectUrl: string; dataUrl: string; relativePath: string; name: string }> {
    const id = `asset_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const objectUrl = URL.createObjectURL(blob);

    // Read full DataURL with Promise to guarantee offline readiness
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file as DataURL'));
      reader.readAsDataURL(blob);
    });

    const fallbackExt = type === 'image' ? 'png' : 'mp3';
    const safeName = sanitizeAssetFilename(originalName, fallbackExt);
    const relativePath = `./assets/${safeName}`;
    const mimeType = blob.type || (type === 'image' ? 'image/png' : 'audio/mpeg');

    const asset: MediaAsset = {
      id,
      name: safeName,
      type,
      mimeType,
      size: blob.size,
      objectUrl,
      dataUrl,
      relativePath,
      associatedPaths: [objectUrl, relativePath, `assets/${safeName}`, originalName],
    };

    this.indexAsset(asset);

    // Save to IndexedDB asynchronously
    this.saveToDb(asset);

    return { id, objectUrl, dataUrl, relativePath, name: safeName };
  }

  // Register a base64 DataURL (e.g. from clipboard or pasted data)
  registerDataUrl(
    dataUrl: string,
    originalName: string,
    type: 'image' | 'audio'
  ): { id: string; objectUrl: string; dataUrl: string; relativePath: string; name: string } {
    try {
      const arr = dataUrl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : (type === 'image' ? 'image/png' : 'audio/mpeg');
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const objectUrl = URL.createObjectURL(blob);
      const id = `asset_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const fallbackExt = type === 'image' ? 'png' : 'mp3';
      const safeName = sanitizeAssetFilename(originalName, fallbackExt);
      const relativePath = `./assets/${safeName}`;

      const asset: MediaAsset = {
        id,
        name: safeName,
        type,
        mimeType: mime,
        size: blob.size,
        objectUrl,
        dataUrl,
        relativePath,
        associatedPaths: [objectUrl, relativePath, `assets/${safeName}`, originalName],
      };

      this.indexAsset(asset);
      this.saveToDb(asset);

      return { id, objectUrl, dataUrl, relativePath, name: safeName };
    } catch {
      const id = `asset_${type}_${Date.now()}`;
      const safeName = sanitizeAssetFilename(originalName, 'bin');
      return { id, objectUrl: dataUrl, dataUrl, relativePath: `./assets/${safeName}`, name: safeName };
    }
  }

  // Register an existing MediaAsset (e.g. during project import)
  registerAsset(asset: MediaAsset): void {
    if (!asset.objectUrl && asset.dataUrl) {
      asset.objectUrl = this.dataUrlToObjectUrl(asset.dataUrl, asset.mimeType);
    }
    this.indexAsset(asset);
    this.saveToDb(asset);
  }

  private async saveToDb(asset: MediaAsset) {
    try {
      const db = await this.initDb();
      if (!db) return;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      // Store asset without ephemeral objectUrl
      const { objectUrl, ...persistable } = asset;
      store.put(persistable);
    } catch {
      // Ignore IndexedDB save error
    }
  }

  get(idOrUrl: string): MediaAsset | undefined {
    if (!idOrUrl) return undefined;
    const clean = idOrUrl.trim();
    if (this.memoryAssets.has(clean)) {
      return this.memoryAssets.get(clean);
    }
    // Also try decoded URL
    try {
      const decoded = decodeURIComponent(clean);
      if (this.memoryAssets.has(decoded)) {
        return this.memoryAssets.get(decoded);
      }
    } catch {}

    // Check with/without leading ./ or /
    const stripped = clean.replace(/^\.?\//, '');
    if (this.memoryAssets.has(stripped)) return this.memoryAssets.get(stripped);
    if (this.memoryAssets.has(`./${stripped}`)) return this.memoryAssets.get(`./${stripped}`);
    if (this.memoryAssets.has(`assets/${stripped}`)) return this.memoryAssets.get(`assets/${stripped}`);
    if (this.memoryAssets.has(`./assets/${stripped}`)) return this.memoryAssets.get(`./assets/${stripped}`);

    // Search through values
    for (const val of this.memoryAssets.values()) {
      if (
        val.id === clean ||
        val.name === clean ||
        val.name === stripped ||
        val.objectUrl === clean ||
        val.relativePath === clean ||
        val.dataUrl === clean
      ) {
        return val;
      }
    }
    return undefined;
  }

  // Scan markdown and metadata for ONLY active assets actually used in the article
  getActiveAssets(markdown: string, coverImage?: string): MediaAsset[] {
    const activeMap = new Map<string, MediaAsset>();

    if (!markdown) return [];

    const mediaLinkRegexes = [
      /!audio\[.*?\]\((.*?)\)/gi,
      /!\[.*?\]\((.*?)\)/gi,
      /<img[^>]+src=["'](.*?)["']/gi,
      /<source[^>]+src=["'](.*?)["']/gi,
      /<audio[^>]+src=["'](.*?)["']/gi,
      /<video[^>]+src=["'](.*?)["']/gi,
      /<a[^>]+href=["'](.*?)["'][^>]*download/gi,
    ];

    const referencedUrls = new Set<string>();

    for (const regex of mediaLinkRegexes) {
      let match;
      while ((match = regex.exec(markdown)) !== null) {
        let rawUrl = (match[1] || '').trim();
        // Remove trailing markdown caption if present (e.g. 'url "title"')
        if (rawUrl.includes(' ') && !rawUrl.startsWith('data:')) {
          rawUrl = rawUrl.split(' ')[0].trim();
        }
        if (rawUrl) {
          referencedUrls.add(rawUrl);
        }
      }
    }

    if (coverImage && typeof coverImage === 'string') {
      referencedUrls.add(coverImage.trim());
    }

    // Resolve referenced URLs to known assets
    for (const url of referencedUrls) {
      const found = this.get(url);
      if (found && found.id && !activeMap.has(found.id)) {
        activeMap.set(found.id, found);
      }
    }

    // Also check if any asset's name, id, or relativePath is directly typed inside the markdown text
    for (const asset of this.getAllAssets()) {
      if (activeMap.has(asset.id)) continue;

      if (
        (asset.name && markdown.includes(asset.name)) ||
        (asset.relativePath && markdown.includes(asset.relativePath)) ||
        (asset.id && markdown.includes(asset.id)) ||
        (asset.objectUrl && markdown.includes(asset.objectUrl))
      ) {
        activeMap.set(asset.id, asset);
      }
    }

    return Array.from(activeMap.values());
  }

  // Prune unused assets from memory and database to free storage
  async clearUnusedAssets(markdown: string, coverImage?: string): Promise<number> {
    const active = this.getActiveAssets(markdown, coverImage);
    const activeIds = new Set(active.map((a) => a.id));
    const all = this.getAllAssets();
    let removedCount = 0;

    const db = await this.initDb();
    const tx = db ? db.transaction(STORE_NAME, 'readwrite') : null;
    const store = tx ? tx.objectStore(STORE_NAME) : null;

    for (const asset of all) {
      if (!activeIds.has(asset.id)) {
        // Revoke objectUrl to free memory
        if (asset.objectUrl && asset.objectUrl.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(asset.objectUrl);
          } catch {}
        }
        // Remove from memory
        for (const [k, v] of this.memoryAssets.entries()) {
          if (v.id === asset.id) {
            this.memoryAssets.delete(k);
          }
        }
        // Remove from IndexedDB
        if (store) {
          store.delete(asset.id);
        }
        removedCount++;
      }
    }

    return removedCount;
  }

  // Resolve an asset or URL to a playable/displayable URL (Object URL or original URL)
  resolveUrl(url: string): string {
    if (!url) return '';
    const cleanUrl = url.trim();
    const asset = this.memoryAssets.get(cleanUrl);
    if (asset) {
      return asset.objectUrl || asset.dataUrl;
    }
    // Fallback: search by id or existing dataUrl in memory
    for (const val of this.memoryAssets.values()) {
      if (val.id === cleanUrl || val.objectUrl === cleanUrl) {
        return val.objectUrl || val.dataUrl;
      }
    }
    return cleanUrl;
  }

  // Resolve an asset to base64 DataURL for Standalone offline HTML export
  resolveForStandaloneExport(url: string): string {
    if (!url) return '';
    const cleanUrl = url.trim();
    if (cleanUrl.startsWith('data:')) {
      return cleanUrl;
    }
    const asset = this.memoryAssets.get(cleanUrl);
    if (asset && asset.dataUrl) {
      return asset.dataUrl;
    }
    // Fallback search across all assets in store (by id or objectUrl)
    for (const val of this.memoryAssets.values()) {
      if (val.id === cleanUrl || val.objectUrl === cleanUrl) {
        return val.dataUrl;
      }
    }
    // If it's a blob url that was not matched directly, check if we have any asset of matching type
    if (cleanUrl.startsWith('blob:')) {
      for (const val of this.memoryAssets.values()) {
        if (val.dataUrl) {
          return val.dataUrl;
        }
      }
    }
    return cleanUrl;
  }

  // Get all registered media assets
  getAllAssets(): MediaAsset[] {
    const unique = new Map<string, MediaAsset>();
    for (const asset of this.memoryAssets.values()) {
      if (asset.id && !unique.has(asset.id)) {
        unique.set(asset.id, asset);
      }
    }
    return Array.from(unique.values());
  }

  // Retrieve binary data for an asset or data URL
  getAssetBinary(idOrUrl: string): { data: Uint8Array; mimeType: string; extension: string; name: string } | null {
    if (!idOrUrl) return null;
    const clean = idOrUrl.trim();

    // Check if it's already a DataURL
    if (clean.startsWith('data:')) {
      const parsed = dataUrlToUint8Array(clean);
      return { ...parsed, name: 'media' };
    }

    // Lookup in memoryAssets
    let asset = this.memoryAssets.get(clean);
    if (!asset) {
      for (const val of this.memoryAssets.values()) {
        if (val.id === clean || val.objectUrl === clean) {
          asset = val;
          break;
        }
      }
    }

    if (asset && asset.dataUrl) {
      const parsed = dataUrlToUint8Array(asset.dataUrl);
      return {
        ...parsed,
        mimeType: asset.mimeType || parsed.mimeType,
        name: asset.name || (asset.type === 'image' ? 'image' : 'audio'),
      };
    }

    return null;
  }
}

export const assetStore = new MediaAssetStore();

// Utility: Convert base64 data URL into pure Uint8Array binary
export function dataUrlToUint8Array(dataUrl: string): { data: Uint8Array; mimeType: string; extension: string } {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) {
      return { data: new Uint8Array(0), mimeType: 'application/octet-stream', extension: 'bin' };
    }
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const binaryStr = atob(parts[1]);
    const len = binaryStr.length;
    const u8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      u8[i] = binaryStr.charCodeAt(i);
    }
    let extension = 'bin';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) extension = 'jpg';
    else if (mimeType.includes('png')) extension = 'png';
    else if (mimeType.includes('webp')) extension = 'webp';
    else if (mimeType.includes('gif')) extension = 'gif';
    else if (mimeType.includes('svg')) extension = 'svg';
    else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) extension = 'mp3';
    else if (mimeType.includes('wav')) extension = 'wav';
    else if (mimeType.includes('ogg')) extension = 'ogg';
    else if (mimeType.includes('mp4') || mimeType.includes('m4a')) extension = 'm4a';

    return { data: u8, mimeType, extension };
  } catch {
    return { data: new Uint8Array(0), mimeType: 'application/octet-stream', extension: 'bin' };
  }
}

// Image compressor utility to optimize uploaded images to clean, ultra-lightweight sizes
export async function optimizeImageFile(
  file: File,
  maxDimension = 1280,
  quality = 0.75
): Promise<Blob> {
  return new Promise((resolve) => {
    // If it's SVG or animated GIF, preserve original format
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
      resolve(file);
      return;
    }

    const img = new Image();
    const tempUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(tempUrl);
      let width = img.width;
      let height = img.height;

      // Calculate aspect ratio downscaling to max 1280px (crisp for reading while keeping file size tiny)
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(file);
        return;
      }

      // Smooth bicubic resampling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Prefer WebP or optimized JPEG to reduce base64 size by up to 80%
      const outputType = 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(blob);
          } else {
            resolve(file);
          }
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(tempUrl);
      resolve(file);
    };

    img.src = tempUrl;
  });
}

