import { registerPlugin, Capacitor } from '@capacitor/core';

export interface NativeMediaItem {
  id: string;
  mediaId: number;
  title: string;
  type: 'photo' | 'video';
  url: string;
  thumbnailUrl: string;
  date: string; // YYYY-MM-DD
  time?: string;
  timestamp: number;
  sizeMb: number;
  sizeBytes?: number;
  album: string; // Real bucket name e.g. "Camera", "WhatsApp Images", "Screenshots", "Downloads"
  mimeType: string;
  durationSec?: number;
  width?: number;
  height?: number;
}

export interface NativeAlbum {
  id: string;
  name: string;
  count: number;
  coverUri: string;
}

export interface NativeMediaStorePlugin {
  checkPermissions(): Promise<{ granted: boolean; permissionState?: string }>;
  requestPermissions(): Promise<{ granted: boolean; permissionState?: string }>;
  getAlbums(): Promise<{ albums: NativeAlbum[] }>;
  getMedia(options?: { bucketId?: string; offset?: number; limit?: number }): Promise<{ items: NativeMediaItem[] }>;
  getThumbnail(options: { mediaId: number; isVideo: boolean }): Promise<{ path: string }>;
  deleteMedia(options: { items: { mediaId: number; isVideo: boolean }[] }): Promise<{ success: boolean; deletedCount?: number }>;
  computeFileHash(options: { path: string }): Promise<{ hash: string }>;
  getStorageStats(): Promise<{
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
    photosBytes: number;
    videosBytes: number;
    appsBytes: number;
    documentsBytes: number;
    otherBytes: number;
  }>;
}

const NativeMediaStore = registerPlugin<NativeMediaStorePlugin>('MediaStorePlugin', {
  web: {
    checkPermissions: async () => {
      const saved = sessionStorage.getItem('neogallery_perm');
      if (saved === 'denied') return { granted: false, permissionState: 'denied' };
      return { granted: true, permissionState: 'granted' };
    },
    requestPermissions: async () => {
      sessionStorage.setItem('neogallery_perm', 'granted');
      return { granted: true, permissionState: 'granted' };
    },
    getAlbums: async () => ({ albums: [] }),
    getMedia: async () => ({ items: [] }),
    getThumbnail: async () => ({ path: '' }),
    deleteMedia: async () => ({ success: false }),
    computeFileHash: async () => ({ hash: '' }),
    getStorageStats: async () => {
      let totalBytes = 64 * 1024 * 1024 * 1024; // 64 GB default
      let usedBytes = 12 * 1024 * 1024 * 1024;
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
        try {
          const est = await navigator.storage.estimate();
          if (est.quota && est.quota > 0) totalBytes = est.quota;
          if (est.usage && est.usage > 0) usedBytes = est.usage;
        } catch {}
      }
      return {
        totalBytes,
        usedBytes,
        freeBytes: Math.max(0, totalBytes - usedBytes),
        photosBytes: 0,
        videosBytes: 0,
        appsBytes: Math.round(usedBytes * 0.3),
        documentsBytes: Math.round(usedBytes * 0.1),
        otherBytes: Math.round(usedBytes * 0.6),
      };
    },
  },
});

export function formatMediaUrl(rawPath: string): string {
  if (!rawPath) return '';
  if (
    rawPath.startsWith('http://') ||
    rawPath.startsWith('https://') ||
    rawPath.startsWith('data:') ||
    rawPath.startsWith('blob:')
  ) {
    return rawPath;
  }
  if (Capacitor.isNativePlatform()) {
    return Capacitor.convertFileSrc(rawPath);
  }
  return rawPath;
}

export { NativeMediaStore };
