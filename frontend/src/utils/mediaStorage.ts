/**
 * Media Storage Utility using IndexedDB with in-memory caching fallback
 * Enables seamless storage and playback of videos and large documents (MP4, WEBM, MKV, MOV, etc.)
 */

const DB_NAME = 'acs_media_db';
const DB_VERSION = 1;
const STORE_NAME = 'media_files';

// In-memory fallback cache
const memoryCache = new Map<string, Blob>();
const activeBlobUrls = new Map<string, string>();

let dbPromise: Promise<IDBDatabase | null> | null = null;

function getDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (err) => {
        console.warn('IndexedDB open error (falling back to memory):', err);
        resolve(null);
      };
    } catch (e) {
      console.warn('IndexedDB exception:', e);
      resolve(null);
    }
  });

  return dbPromise;
}

/**
 * Save a media Blob / File to persistent IndexedDB
 */
export async function saveMediaBlob(id: string, fileOrBlob: Blob | File): Promise<void> {
  if (!id || !fileOrBlob) return;

  // Always keep in memory cache for immediate access
  memoryCache.set(id, fileOrBlob);

  const db = await getDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put({
        id,
        blob: fileOrBlob,
        type: fileOrBlob.type,
        updatedAt: Date.now()
      });

      request.onsuccess = () => resolve();
      request.onerror = (err) => {
        console.warn('IndexedDB put error:', err);
        resolve();
      };
    } catch (e) {
      console.warn('IndexedDB save exception:', e);
      resolve();
    }
  });
}

/**
 * Retrieve a media Blob from memory cache or IndexedDB
 */
export async function getMediaBlob(id: string): Promise<Blob | null> {
  if (!id) return null;

  if (memoryCache.has(id)) {
    return memoryCache.get(id)!;
  }

  const db = await getDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const result = request.result;
        if (result && result.blob) {
          memoryCache.set(id, result.blob);
          resolve(result.blob);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    } catch (e) {
      console.warn('IndexedDB get error:', e);
      resolve(null);
    }
  });
}

/**
 * Retrieve or generate a playable object URL for a media document
 */
export async function getMediaBlobUrl(id: string, fallbackDataUrl?: string): Promise<string> {
  // Check if we already have an active blob URL
  if (activeBlobUrls.has(id)) {
    return activeBlobUrls.get(id)!;
  }

  const blob = await getMediaBlob(id);
  if (blob) {
    const url = URL.createObjectURL(blob);
    activeBlobUrls.set(id, url);
    return url;
  }

  if (fallbackDataUrl && fallbackDataUrl.length > 20) {
    return fallbackDataUrl;
  }

  return '';
}

/**
 * Link an existing media blob from an old ID (e.g. temporary doc-123) to a new ID (e.g. backend ID)
 */
export async function linkMediaBlob(oldId: string, newId: string): Promise<void> {
  if (!oldId || !newId || oldId === newId) return;
  const blob = await getMediaBlob(oldId);
  if (blob) {
    await saveMediaBlob(newId, blob);
  }
}

/**
 * Delete a media blob when the document is removed
 */
export async function deleteMediaBlob(id: string): Promise<void> {
  memoryCache.delete(id);

  if (activeBlobUrls.has(id)) {
    try {
      URL.revokeObjectURL(activeBlobUrls.get(id)!);
    } catch {
      // ignore
    }
    activeBlobUrls.delete(id);
  }

  const db = await getDB();
  if (!db) return;

  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
  } catch (e) {
    console.warn('IndexedDB delete error:', e);
  }
}

/**
 * Helper to identify if a file is a video
 */
export function isVideoFile(fileName?: string, mimeType?: string): boolean {
  if (mimeType && mimeType.toLowerCase().startsWith('video/')) {
    return true;
  }
  if (!fileName) return false;
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  return ['mp4', 'mkv', 'avi', 'mov', 'webm', '3gp', 'wmv', 'flv', 'm4v', 'ogv'].includes(ext);
}

/**
 * Helper to identify if a file is an audio track
 */
export function isAudioFile(fileName?: string, mimeType?: string): boolean {
  if (mimeType && mimeType.toLowerCase().startsWith('audio/')) {
    return true;
  }
  if (!fileName) return false;
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  return ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus', 'weba', 'wma', 'aiff'].includes(ext);
}
