/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { MainTab, BottomNav } from './components/BottomNav';
import { AppHeader } from './components/AppHeader';
import { PhotoGrid } from './components/PhotoGrid';
import { PhotoViewer } from './components/PhotoViewer';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { PhotoEditorModal } from './components/PhotoEditorModal';
import { PhotoCompressorModal } from './components/PhotoCompressorModal';
import { PrivateVaultModal } from './components/PrivateVaultModal';
import { SmartCleanerModal } from './components/SmartCleanerModal';
import { MemoriesView } from './components/MemoriesView';
import { AlbumsView } from './components/AlbumsView';
import { SearchView } from './components/SearchView';
import { RecycleBinModal } from './components/RecycleBinModal';
import { SettingsView } from './components/SettingsView';
import { AndroidStatusBar } from './components/AndroidStatusBar';
import { AndroidToast } from './components/AndroidToast';
import { SelectionToolbar } from './components/SelectionToolbar';

import { AdBanner } from './components/AdBanner';
import { AdInterstitial } from './components/AdInterstitial';
import { PremiumModal } from './components/PremiumModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { TermsModal } from './components/TermsModal';
import { PermissionsModal } from './components/PermissionsModal';
import { PlayStoreAssetsModal } from './components/PlayStoreAssetsModal';
import { VaultLockScreen } from './components/VaultLockScreen';
import { BillingService } from './services/billing';
import { MediaService } from './services/media';

import { getThemeConfig, THEMES, DEFAULT_THEME_ID } from './theme/themes';
import { ThemeBackground } from './theme/ThemeBackground';
import {
  INITIAL_MEDIA,
  INITIAL_ALBUMS,
  INITIAL_MEMORIES,
} from './data/sampleMedia';
import {
  MediaItem,
  Album,
  MemoryCard,
  VaultConfig,
  AppSettings,
  GridColumns,
  ThemeId,
} from './types';

export default function App() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanningMedia, setIsScanningMedia] = useState(false);

  // App state with local persistence
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('neo_gallery_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.currentTheme || !(parsed.currentTheme in THEMES)) {
          parsed.currentTheme = DEFAULT_THEME_ID;
        }
        return parsed;
      }
    } catch {}
    return {
      currentTheme: DEFAULT_THEME_ID,
      isPremium: false,
      performanceMode: false,
      adsEnabled: true,
      gridColumns: 3,
      autoLockVault: true,
      sortBy: 'date-desc',
    };
  });

  const [mediaItems, setMediaItems] = useState<MediaItem[]>(() => {
    try {
      const saved = localStorage.getItem('neo_gallery_media');
      if (saved && Array.isArray(JSON.parse(saved))) return JSON.parse(saved);
    } catch {}
    return INITIAL_MEDIA;
  });

  const [albums, setAlbums] = useState<Album[]>(() => {
    try {
      const saved = localStorage.getItem('neo_gallery_albums');
      if (saved && Array.isArray(JSON.parse(saved))) return JSON.parse(saved);
    } catch {}
    return INITIAL_ALBUMS;
  });

  const [memories, setMemories] = useState<MemoryCard[]>(() => {
    try {
      const saved = localStorage.getItem('neo_gallery_memories');
      if (saved && Array.isArray(JSON.parse(saved))) return JSON.parse(saved);
    } catch {}
    return INITIAL_MEMORIES;
  });

  const [vaultConfig, setVaultConfig] = useState<VaultConfig>(() => {
    try {
      const saved = localStorage.getItem('neo_gallery_vault_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      isLocked: true,
      unlockMethod: 'pin',
      pinCode: '1234',
      patternNodes: [0, 1, 2, 4],
      isFingerprintEnabled: true,
      failedAttempts: 0,
      lockUntil: null,
      isHiddenMode: false,
    };
  });

  // Navigation & View States
  const [activeTab, setActiveTab] = useState<MainTab>('photos');
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);

  // Modals
  const [viewingMedia, setViewingMedia] = useState<MediaItem | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [playingVideoMedia, setPlayingVideoMedia] = useState<MediaItem | null>(null);
  const [editingPhotoMedia, setEditingPhotoMedia] = useState<MediaItem | null>(null);
  const [compressingMedia, setCompressingMedia] = useState<MediaItem | null>(null);

  const [showVault, setShowVault] = useState(false);
  const [showVaultLock, setShowVaultLock] = useState(false);
  const [vaultLockMode, setVaultLockMode] = useState<'unlock' | 'change-password' | 'change-lock-style'>('unlock');
  const [showCleaner, setShowCleaner] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showRecycleBin, setShowRecycleBin] = useState(false);

  // New Compliance & Premium States
  const [showPremium, setShowPremium] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showPlayStoreAssets, setShowPlayStoreAssets] = useState(false);
  const [showInterstitial, setShowInterstitial] = useState(false);

  const [appToast, setAppToast] = useState<string | null>(null);

  const showToast = (msg: string, durationMs: number = 2500) => {
    setAppToast(msg);
    setTimeout(() => setAppToast(null), durationMs);
  };

  // Load Device Media & Request Permissions.
  // silent=true is used for automatic background rescans (app resume, etc.)
  // so newly added photos/videos get picked up without interrupting the user
  // with a toast/spinner every time they switch back to the app.
  const loadDeviceMedia = async (silent: boolean = false) => {
    if (!silent) setIsScanningMedia(true);
    try {
      let granted = await MediaService.checkPermissions();
      if (!granted) {
        granted = await MediaService.requestPermissions();
      }
      setHasPermission(granted);

      if (granted) {
        const items = await MediaService.getAllMedia();
        setMediaItems(items);
        if (!silent) {
          if (items.length === 0) {
            showToast('Permission granted, but 0 items found on device.', 5000);
          } else {
            showToast(`Loaded ${items.length} item(s) from device`);
          }
        }
      } else if (!silent) {
        showToast('Storage permission was not granted');
      }
    } catch (err) {
      console.error('Neo Gallery: loadDeviceMedia failed', err);
      if (!silent) {
        showToast('Scan failed: ' + (err instanceof Error ? err.message : String(err)), 5000);
      }
    } finally {
      if (!silent) setIsScanningMedia(false);
    }
  };

  const handleImportDeviceFiles = (fileList: FileList) => {
    const imported = MediaService.createMediaItemsFromFiles(fileList);
    setMediaItems((prev) => [...imported, ...prev]);
    showToast(`Added ${imported.length} media items from device`);
  };

  useEffect(() => {
    loadDeviceMedia();
  }, []);

  // Auto re-scan (silently, in the background) whenever the app comes back
  // to the foreground -- e.g. the user takes a photo or gets a WhatsApp image
  // in another app, then switches back to Neo Gallery. This is throttled so
  // rapid app-switching doesn't trigger a rescan every time.
  useEffect(() => {
    let lastScan = Date.now();
    const MIN_INTERVAL_MS = 4000;

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastScan < MIN_INTERVAL_MS) return;
      lastScan = now;
      loadDeviceMedia(true);
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  // Recalculate real albums and memories whenever media items change
  useEffect(() => {
    if (mediaItems.length >= 0) {
      MediaService.getAlbumsFromMedia(mediaItems).then(setAlbums);
      const realMemories = MediaService.generateDateBasedMemories(mediaItems);
      setMemories(realMemories);
    }
  }, [mediaItems]);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('neo_gallery_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    MediaService.saveMediaList(mediaItems);
  }, [mediaItems]);

  useEffect(() => {
    localStorage.setItem('neo_gallery_albums', JSON.stringify(albums));
  }, [albums]);

  useEffect(() => {
    localStorage.setItem('neo_gallery_vault_config', JSON.stringify(vaultConfig));
  }, [vaultConfig]);

  const activeTheme = useMemo(() => getThemeConfig(settings.currentTheme), [settings.currentTheme]);

  // Main filtered gallery photos (excluding vault items & deleted items)
  const visiblePhotos = useMemo(() => {
    return mediaItems.filter((item) => {
      if (item.inVault || item.isDeleted) return false;

      if (selectedAlbum) {
        if (selectedAlbum.systemType === 'favorites') return item.isFavorite;
        if (selectedAlbum.systemType === 'videos') return item.type === 'video';
        return item.album.toLowerCase() === selectedAlbum.name.toLowerCase();
      }

      return true;
    });
  }, [mediaItems, selectedAlbum]);

  const vaultMedia = useMemo(() => {
    return mediaItems.filter((m) => m.inVault && !m.isDeleted);
  }, [mediaItems]);

  const deletedMedia = useMemo(() => {
    return mediaItems.filter((m) => m.isDeleted);
  }, [mediaItems]);

  // Handlers
  const handleToggleFavorite = (id: string) => {
    setMediaItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isFavorite: !item.isFavorite } : item))
    );
  };

  const handleDeleteMedia = (id: string) => {
    setMediaItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              isDeleted: true,
              deletedAt: new Date().toISOString().split('T')[0],
              daysRemainingInBin: 30,
            }
          : item
      )
    );
    if (viewingMedia?.id === id) setViewingMedia(null);
  };

  const handleBatchDeleteMedia = (ids: string[]) => {
    setMediaItems((prev) =>
      prev.map((item) =>
        ids.includes(item.id)
          ? {
              ...item,
              isDeleted: true,
              deletedAt: new Date().toISOString().split('T')[0],
              daysRemainingInBin: 30,
            }
          : item
      )
    );
  };

  const handleMoveToVault = (id: string) => {
    setMediaItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, inVault: true } : item))
    );
    if (viewingMedia?.id === id) setViewingMedia(null);
  };

  const handleRestoreFromVault = (id: string) => {
    setMediaItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, inVault: false } : item))
    );
  };

  const handleRestoreFromBin = (id: string) => {
    setMediaItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isDeleted: false } : item))
    );
  };

  // Opens the real Android/iOS share sheet (WhatsApp, Messenger, imo, etc. --
  // whatever's actually installed) using the raw device file paths.
  const handleShare = async (items: MediaItem[]) => {
    if (items.length === 0) return;
    if (!Capacitor.isNativePlatform()) {
      showToast('Sharing only works on the installed app, not in this preview');
      return;
    }
    try {
      const paths = items.map((i) => i.rawPath || i.url).filter(Boolean);
      await Share.share({
        files: paths,
        dialogTitle: items.length > 1 ? `Share ${items.length} items` : 'Share',
      });
    } catch (err) {
      // The user closing the share sheet without picking anything also
      // rejects the promise -- don't show an error toast for that.
      const msg = err instanceof Error ? err.message : String(err);
      if (!/cancel/i.test(msg)) {
        showToast('Share failed: ' + msg);
      }
    }
  };

  // --- Selection mode (long-press to start, like a normal gallery app) ---
  const handleLongPressSelect = (id: string) => {
    setIsSelectionMode(true);
    setSelectedIds([id]);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSelectAllVisible = (visibleIds: string[]) => {
    setSelectedIds((prev) => (prev.length === visibleIds.length ? [] : visibleIds));
  };

  const handleExitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds([]);
  };

  const handleBulkShare = () => {
    const items = mediaItems.filter((m) => selectedIds.includes(m.id));
    handleShare(items);
  };

  const handleBulkDelete = async () => {
    const items = mediaItems.filter((m) => selectedIds.includes(m.id));
    if (items.length === 0) return;
    const { success, deletedIds } = await MediaService.deleteFromDevice(items);
    if (!success) {
      showToast('Delete cancelled or failed');
      return;
    }
    setMediaItems((prev) => prev.filter((m) => !deletedIds.includes(m.id)));
    showToast(`Deleted ${deletedIds.length} item(s)`);
    handleExitSelectionMode();
  };

  const handleBulkAddToAlbum = (albumId: string) => {
    setMediaItems((prev) =>
      prev.map((m) =>
        selectedIds.includes(m.id)
          ? { ...m, customAlbumIds: Array.from(new Set([...(m.customAlbumIds || []), albumId])) }
          : m
      )
    );
    setAlbums((prev) =>
      prev.map((a) => (a.id === albumId ? { ...a, count: (a.count || 0) + selectedIds.length } : a))
    );
    showToast(`Added ${selectedIds.length} item(s) to album`);
    handleExitSelectionMode();
  };

  // Smart Cleaner deletes are real, immediate device deletes (that's the
  // point of a "cleaner" -- reclaiming actual space), same system
  // confirmation flow as everywhere else.
  const handleCleanerDelete = async (ids: string[]) => {
    const items = mediaItems.filter((m) => ids.includes(m.id));
    if (items.length === 0) return;
    const { success, deletedIds } = await MediaService.deleteFromDevice(items);
    if (!success) {
      showToast('Delete cancelled or failed');
      return;
    }
    setMediaItems((prev) => prev.filter((m) => !deletedIds.includes(m.id)));
    showToast(`Freed up space: ${deletedIds.length} item(s) deleted`);
  };

  const [isScanningDuplicates, setIsScanningDuplicates] = useState(false);
  const [duplicateScanProgress, setDuplicateScanProgress] = useState({ done: 0, total: 0 });

  const handleScanDuplicates = async () => {
    setIsScanningDuplicates(true);
    setDuplicateScanProgress({ done: 0, total: 0 });
    try {
      const updated = await MediaService.scanForDuplicates(mediaItems, (done, total) =>
        setDuplicateScanProgress({ done, total })
      );
      setMediaItems(updated);
      const foundCount = updated.filter((m) => m.isDuplicate).length;
      showToast(foundCount > 0 ? `Found ${foundCount} duplicate item(s)` : 'No duplicates found', 3500);
    } finally {
      setIsScanningDuplicates(false);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    const item = mediaItems.find((m) => m.id === id);
    if (item) {
      const { success, deletedIds } = await MediaService.deleteFromDevice([item]);
      if (!success) {
        showToast('Could not delete from device storage');
        return;
      }
      setMediaItems((prev) => prev.filter((m) => !deletedIds.includes(m.id)));
    } else {
      setMediaItems((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const handleEmptyBin = async () => {
    const binned = mediaItems.filter((m) => m.isDeleted);
    if (binned.length === 0) return;
    const { success, deletedIds } = await MediaService.deleteFromDevice(binned);
    if (!success) {
      showToast('Could not delete from device storage');
      return;
    }
    setMediaItems((prev) => prev.filter((m) => !deletedIds.includes(m.id)));
    showToast(`Permanently deleted ${deletedIds.length} item(s)`);
  };

  const handleSaveCompressed = (originalId: string, compressedSizeMb: number) => {
    setMediaItems((prev) =>
      prev.map((item) =>
        item.id === originalId
          ? {
              ...item,
              originalSizeMb: item.sizeMb,
              sizeMb: compressedSizeMb,
              compressedSizeMb: compressedSizeMb,
            }
          : item
      )
    );
  };

  const handleSaveEditedPhoto = (editedMedia: MediaItem) => {
    setMediaItems((prev) => [editedMedia, ...prev]);
  };

  const handleCreateAlbum = (name: string) => {
    const newAlbum: Album = {
      id: `alb-custom-${Date.now()}`,
      name,
      coverUrl: mediaItems[0]?.thumbnailUrl || '',
      count: 0,
      systemType: 'custom',
    };
    setAlbums((prev) => [...prev, newAlbum]);
  };

  const handleDeleteAlbum = (id: string) => {
    setAlbums((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUnlockPremium = () => {
    setSettings((prev) => ({ ...prev, isPremium: true, adsEnabled: false }));
  };

  // Photo viewer prev / next navigation
  const currentIndexInGrid = viewingMedia
    ? visiblePhotos.findIndex((m) => m.id === viewingMedia.id)
    : -1;

  const handleViewerNext = () => {
    if (currentIndexInGrid >= 0 && currentIndexInGrid < visiblePhotos.length - 1) {
      setViewingMedia(visiblePhotos[currentIndexInGrid + 1]);
    }
  };

  const handleViewerPrev = () => {
    if (currentIndexInGrid > 0) {
      setViewingMedia(visiblePhotos[currentIndexInGrid - 1]);
    }
  };

  return (
    <div className={`min-h-screen relative font-sans ${activeTheme.bgClass} transition-colors duration-300 select-none`}>
      {/* Background Theme Layer (1 of 7 themes) */}
      <ThemeBackground
        themeId={settings.currentTheme}
        performanceMode={settings.performanceMode}
        animationsEnabled={settings.animationsEnabled ?? true}
        animationIntensity={settings.animationIntensity ?? 'medium'}
        isMediaOpen={!!viewingMedia || !!playingVideoMedia}
      />

      {/* Android Toast Notification */}
      <AndroidToast message={appToast} onClose={() => setAppToast(null)} />

      {isSelectionMode && (
        <SelectionToolbar
          theme={activeTheme}
          selectedCount={selectedIds.length}
          totalVisibleCount={visiblePhotos.length}
          allSelected={selectedIds.length > 0 && selectedIds.length === visiblePhotos.length}
          customAlbums={albums.filter((a) => a.systemType === 'custom')}
          onSelectAll={() => handleSelectAllVisible(visiblePhotos.map((m) => m.id))}
          onCancel={handleExitSelectionMode}
          onShare={handleBulkShare}
          onDelete={handleBulkDelete}
          onAddToAlbum={handleBulkAddToAlbum}
        />
      )}

      {/* Main Header */}
      <AppHeader
        theme={activeTheme}
        gridColumns={settings.gridColumns}
        onChangeGridColumns={(cols) => setSettings((prev) => ({ ...prev, gridColumns: cols }))}
        onOpenSearch={() => setShowSearch(true)}
        onOpenRecycleBin={() => setShowRecycleBin(true)}
        isPremium={settings.isPremium}
        performanceMode={settings.performanceMode}
        onTogglePerformanceMode={() =>
          setSettings((prev) => ({ ...prev, performanceMode: !prev.performanceMode }))
        }
        deletedItemsCount={deletedMedia.length}
      />

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-2 sm:px-4 pt-3 pb-28">
        {/* Selected Album Filter Header Banner */}
          {selectedAlbum && activeTab === 'photos' && (
            <div className="mb-4 p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-cyan-400">Album:</span>
                <span className="text-sm font-bold text-white">{selectedAlbum.name}</span>
              </div>
              <button
                onClick={() => setSelectedAlbum(null)}
                className="text-xs text-zinc-400 hover:text-white underline"
              >
                Clear Filter
              </button>
            </div>
          )}

          {/* TAB 1: PHOTOS GRID */}
          {activeTab === 'photos' && (
            <PhotoGrid
              mediaItems={visiblePhotos}
              gridColumns={settings.gridColumns}
              theme={activeTheme}
              onSelectMedia={(item) => setViewingMedia(item)}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              isSelectionMode={isSelectionMode}
              hasPermission={hasPermission}
              isScanning={isScanningMedia}
              onRequestPermission={loadDeviceMedia}
              onImportFiles={handleImportDeviceFiles}
              onLongPress={handleLongPressSelect}
            />
          )}

          {/* TAB 2: ALBUMS */}
          {activeTab === 'albums' && (
            <AlbumsView
              albums={albums}
              mediaItems={mediaItems}
              theme={activeTheme}
              onSelectAlbum={(alb) => {
                setSelectedAlbum(alb);
                setActiveTab('photos');
              }}
              onCreateAlbum={handleCreateAlbum}
              onDeleteAlbum={handleDeleteAlbum}
              isPremium={settings.isPremium}
            />
          )}

          {/* TAB 3: MEMORIES */}
          {activeTab === 'memories' && (
            <MemoriesView
              memories={memories}
              mediaItems={mediaItems}
              theme={activeTheme}
              onOpenMedia={(item) => setViewingMedia(item)}
            />
          )}

          {/* TAB 4: SETTINGS */}
          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              mediaItems={mediaItems}
              theme={activeTheme}
              onSelectTheme={(themeId) => {
                setSettings((prev) => ({ ...prev, currentTheme: themeId }));
                showToast('Theme background updated!');
              }}
              onOpenCleaner={() => setShowCleaner(true)}
              onOpenVault={() => {
                setVaultLockMode('unlock');
                setShowVaultLock(true);
              }}
              onChangeVaultPassword={() => {
                setVaultLockMode('change-password');
                setShowVaultLock(true);
              }}
              onChangeVaultLockStyle={() => {
                setVaultLockMode('change-lock-style');
                setShowVaultLock(true);
              }}
              onOpenRecycleBin={() => setShowRecycleBin(true)}
              onTogglePerformanceMode={() =>
                setSettings((prev) => ({ ...prev, performanceMode: !prev.performanceMode }))
              }
              onToggleAnimations={(enabled) =>
                setSettings((prev) => ({ ...prev, animationsEnabled: enabled }))
              }
              onChangeAnimationIntensity={(intensity) =>
                setSettings((prev) => ({ ...prev, animationIntensity: intensity }))
              }
              onUnlockPremium={() => setShowPremium(true)}
              onOpenPrivacyPolicy={() => setShowPrivacyPolicy(true)}
              onOpenTerms={() => setShowTerms(true)}
              onOpenPermissions={() => setShowPermissions(true)}
              onOpenPlayStoreAssets={() => setShowPlayStoreAssets(true)}
            />
          )}
        </main>

        {/* AdBanner placed above Bottom Navigation */}
        <AdBanner />

        {/* Bottom Navigation */}
        <BottomNav
          activeTab={activeTab}
          onChangeTab={(tab) => {
            setActiveTab(tab);
            if (tab !== 'photos') setSelectedAlbum(null);
          }}
          theme={activeTheme}
          onOpenVault={() => {
            setVaultLockMode('unlock');
            setShowVaultLock(true);
          }}
          onOpenCleaner={() => setShowCleaner(true)}
        />

      {/* MODALS */}
      {/* 1. Fullscreen Photo Viewer */}
      {viewingMedia && (
        <PhotoViewer
          media={viewingMedia}
          onClose={() => setViewingMedia(null)}
          onNext={handleViewerNext}
          onPrev={handleViewerPrev}
          onToggleFavorite={handleToggleFavorite}
          onDelete={handleDeleteMedia}
          onMoveToVault={handleMoveToVault}
          onOpenEditor={(media) => setEditingPhotoMedia(media)}
          onOpenCompressor={(media) => setCompressingMedia(media)}
          onOpenVideoPlayer={(media) => setPlayingVideoMedia(media)}
          onShare={(media) => handleShare([media])}
          theme={activeTheme}
        />
      )}

      {/* 2. Premium Video Player */}
      {playingVideoMedia && (
        <VideoPlayerModal
          media={playingVideoMedia}
          onClose={() => setPlayingVideoMedia(null)}
          theme={activeTheme}
        />
      )}

      {/* 3. Photo Editor */}
      {editingPhotoMedia && (
        <PhotoEditorModal
          media={editingPhotoMedia}
          onClose={() => setEditingPhotoMedia(null)}
          onSave={handleSaveEditedPhoto}
          theme={activeTheme}
        />
      )}

      {/* 4. Photo Compressor */}
      {compressingMedia && (
        <PhotoCompressorModal
          media={compressingMedia}
          onClose={() => setCompressingMedia(null)}
          onSaveCompressed={handleSaveCompressed}
          theme={activeTheme}
        />
      )}

      {/* Vault Lock Screen */}
      <VaultLockScreen
        isOpen={showVaultLock}
        initialMode={vaultLockMode}
        onSuccess={() => {
          setShowVaultLock(false);
          if (vaultLockMode === 'unlock') {
            setShowVault(true);
          }
        }}
        onCancel={() => setShowVaultLock(false)}
        onToast={showToast}
      />

      {/* 5. Private Vault */}
      {showVault && (
        <PrivateVaultModal
          vaultConfig={vaultConfig}
          vaultMedia={vaultMedia}
          onUpdateVaultConfig={(cfg) => setVaultConfig(cfg)}
          onRestoreFromVault={handleRestoreFromVault}
          onClose={() => setShowVault(false)}
          theme={activeTheme}
          onSelectMedia={(item) => setViewingMedia(item)}
        />
      )}

      {/* 6. Smart Storage Cleaner */}
      {showCleaner && (
        <SmartCleanerModal
          mediaItems={mediaItems.filter((m) => !m.inVault && !m.isDeleted)}
          onDeleteMedia={(id) => handleCleanerDelete([id])}
          onBatchDeleteMedia={handleCleanerDelete}
          onScanDuplicates={handleScanDuplicates}
          isScanningDuplicates={isScanningDuplicates}
          duplicateScanProgress={duplicateScanProgress}
          onClose={() => setShowCleaner(false)}
          theme={activeTheme}
        />
      )}

      {/* 7. Search */}
      {showSearch && (
        <SearchView
          mediaItems={mediaItems}
          theme={activeTheme}
          onSelectMedia={(item) => {
            setViewingMedia(item);
            setShowSearch(false);
          }}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* 8. Recycle Bin */}
      {showRecycleBin && (
        <RecycleBinModal
          deletedItems={deletedMedia}
          onRestore={handleRestoreFromBin}
          onPermanentDelete={handlePermanentDelete}
          onEmptyBin={handleEmptyBin}
          onClose={() => setShowRecycleBin(false)}
          theme={activeTheme}
        />
      )}

      {/* 10. Premium Pro Modal */}
      <PremiumModal
        isOpen={showPremium}
        onClose={() => setShowPremium(false)}
        onStatusChanged={() => {
          const isPrem = BillingService.isPremium();
          setSettings((prev) => ({ ...prev, isPremium: isPrem, adsEnabled: !isPrem }));
          showToast(isPrem ? 'Upgraded to Neo Gallery Pro!' : 'Reverted to Free Tier');
        }}
      />

      {/* 11. Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={showPrivacyPolicy}
        onClose={() => setShowPrivacyPolicy(false)}
      />

      {/* 12. Terms & Conditions Modal */}
      <TermsModal
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
      />

      {/* 13. Permissions Disclosure Modal */}
      <PermissionsModal
        isOpen={showPermissions}
        onClose={() => setShowPermissions(false)}
        onRequestPermission={loadDeviceMedia}
      />

      {/* 14. Play Store Assets Modal */}
      <PlayStoreAssetsModal
        isOpen={showPlayStoreAssets}
        onClose={() => setShowPlayStoreAssets(false)}
        onToast={showToast}
      />

      {/* Interstitial Ad Slot */}
      <AdInterstitial
        isOpen={showInterstitial}
        onClose={() => setShowInterstitial(false)}
      />
    </div>
  );
}
