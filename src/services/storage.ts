// ============================================================================
// STORAGE SERVICE - CAPACITOR-READY ABSTRACTION LAYER
// Handles persistent key-value storage, IndexedDB media cache, and secure hashes.
// // TODO: Capacitor native swap point -> Swap with @capacitor/preferences or @capacitor/filesystem
// ============================================================================

import { MediaItem } from '../types';
import { NativeMediaStore } from './nativeMediaStore';
import { Capacitor } from '@capacitor/core';

export interface StorageCategoryStats {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  photosBytes: number;
  videosBytes: number;
  appsBytes: number;
  documentsBytes: number;
  otherBytes: number;
  formatted: {
    total: string;
    used: string;
    free: string;
    photos: string;
    videos: string;
    apps: string;
    documents: string;
    other: string;
  };
  percentages: {
    used: number;
    photos: number;
    videos: number;
    apps: number;
    documents: number;
    other: number;
  };
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${val} ${sizes[i]}`;
}

const STORAGE_PREFIX = 'neogallery_';

// Simple SHA-256 hash using Web Crypto API or JS fallback for PIN/Pattern security
export async function hashString(input: string): Promise<string> {
  if (window.crypto && window.crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(input);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallthrough to simple hash if crypto fail
    }
  }
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'fallback_hash_' + Math.abs(hash).toString(16);
}

export const StorageService = {
  // Sync LocalStorage wrappers
  getItem<T>(key: string, defaultValue: T): T {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  },

  removeItem(key: string): void {
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
    } catch (e) {
      console.warn('LocalStorage remove failed:', e);
    }
  },

  clearAllData(): void {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }
  },

  // Calculate REAL Android Device Storage Statistics
  async getStorageStats(mediaItems: MediaItem[] = []): Promise<StorageCategoryStats> {
    let nativeStats: Partial<{
      totalBytes: number;
      freeBytes: number;
      usedBytes: number;
      photosBytes: number;
      videosBytes: number;
      appsBytes: number;
      documentsBytes: number;
      otherBytes: number;
    }> = {};

    try {
      nativeStats = await NativeMediaStore.getStorageStats();
    } catch (err) {
      console.warn('Failed to fetch native storage stats:', err);
    }

    // Calculate photos, videos, and documents bytes directly from accessible media items
    const nonDeleted = mediaItems.filter((m) => !m.isDeleted && !m.inVault);

    let calculatedPhotosBytes = 0;
    let calculatedVideosBytes = 0;

    nonDeleted.forEach((item) => {
      const sizeBytes = Math.round((item.sizeMb || 1.0) * 1024 * 1024);
      if (item.type === 'video') {
        calculatedVideosBytes += sizeBytes;
      } else {
        calculatedPhotosBytes += sizeBytes;
      }
    });

    const totalBytes = nativeStats.totalBytes || 64 * 1024 * 1024 * 1024;
    const freeBytes = nativeStats.freeBytes ?? Math.max(0, totalBytes - (32 * 1024 * 1024 * 1024));
    const usedBytes = nativeStats.usedBytes ?? Math.max(0, totalBytes - freeBytes);

    // Prefer the real native photo/video totals (queried directly from
    // MediaStore). Only fall back to totals calculated from currently-loaded
    // items if the native call genuinely didn't return anything.
    const photosBytes = nativeStats.photosBytes && nativeStats.photosBytes > 0
      ? nativeStats.photosBytes
      : calculatedPhotosBytes;

    const videosBytes = nativeStats.videosBytes && nativeStats.videosBytes > 0
      ? nativeStats.videosBytes
      : calculatedVideosBytes;

    // Everything on the device that isn't a photo or video (apps, documents,
    // downloads, cache, system files, etc.) is reported together as "other" --
    // we deliberately don't fabricate a guessed apps/documents split, since a
    // made-up percentage is misleading and made the numbers look inconsistent
    // between scans.
    const appsBytes = 0;
    const documentsBytes = 0;
    const otherBytes = Math.max(0, usedBytes - photosBytes - videosBytes);

    const calcPercent = (val: number) => (totalBytes > 0 ? Number(((val / totalBytes) * 100).toFixed(1)) : 0);

    return {
      totalBytes,
      usedBytes,
      freeBytes,
      photosBytes,
      videosBytes,
      appsBytes,
      documentsBytes,
      otherBytes,
      formatted: {
        total: formatBytes(totalBytes),
        used: formatBytes(usedBytes),
        free: formatBytes(freeBytes),
        photos: formatBytes(photosBytes),
        videos: formatBytes(videosBytes),
        apps: formatBytes(appsBytes),
        documents: formatBytes(documentsBytes),
        other: formatBytes(otherBytes),
      },
      percentages: {
        used: calcPercent(usedBytes),
        photos: calcPercent(photosBytes),
        videos: calcPercent(videosBytes),
        apps: calcPercent(appsBytes),
        documents: calcPercent(documentsBytes),
        other: calcPercent(otherBytes),
      },
    };
  },
};
