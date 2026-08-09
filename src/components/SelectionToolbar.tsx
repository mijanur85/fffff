import React, { useState } from 'react';
import { X, CheckSquare, Share2, FolderPlus, Trash2 } from 'lucide-react';
import { Album, ThemeConfig } from '../types';

interface Props {
  theme: ThemeConfig;
  selectedCount: number;
  totalVisibleCount: number;
  allSelected: boolean;
  customAlbums: Album[];
  onSelectAll: () => void;
  onCancel: () => void;
  onShare: () => void;
  onDelete: () => void;
  onAddToAlbum: (albumId: string) => void;
}

export const SelectionToolbar: React.FC<Props> = ({
  selectedCount,
  allSelected,
  customAlbums,
  onSelectAll,
  onCancel,
  onShare,
  onDelete,
  onAddToAlbum,
}) => {
  const [showAlbumPicker, setShowAlbumPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 px-3 py-2.5 bg-zinc-950/95 backdrop-blur-xl border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-1.5 rounded-full hover:bg-white/10 text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-white">{selectedCount} selected</span>
        </div>
        <button
          onClick={onSelectAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer"
        >
          <CheckSquare className="w-3.5 h-3.5" />
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-4 py-3 bg-zinc-950/95 backdrop-blur-xl border-t border-white/10 flex items-center justify-around">
        <button
          onClick={onShare}
          disabled={selectedCount === 0}
          className="flex flex-col items-center gap-1 text-white disabled:opacity-30 cursor-pointer"
        >
          <Share2 className="w-5 h-5" />
          <span className="text-[10px] font-medium">Share</span>
        </button>
        <button
          onClick={() => setShowAlbumPicker(true)}
          disabled={selectedCount === 0}
          className="flex flex-col items-center gap-1 text-white disabled:opacity-30 cursor-pointer"
        >
          <FolderPlus className="w-5 h-5" />
          <span className="text-[10px] font-medium">Add to album</span>
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          disabled={selectedCount === 0}
          className="flex flex-col items-center gap-1 text-red-400 disabled:opacity-30 cursor-pointer"
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-[10px] font-medium">Delete</span>
        </button>
      </div>

      {/* Album picker sheet */}
      {showAlbumPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-lg bg-zinc-950 border-t border-cyan-500/30 rounded-t-3xl p-5 text-white space-y-3 max-h-[70vh] overflow-y-auto">
            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto -mt-1 mb-2" />
            <h3 className="text-sm font-bold">Add {selectedCount} item(s) to album</h3>
            {customAlbums.length === 0 ? (
              <p className="text-xs text-zinc-400">No albums yet. Create one from the Albums tab first.</p>
            ) : (
              <div className="space-y-2">
                {customAlbums.map((album) => (
                  <button
                    key={album.id}
                    onClick={() => {
                      onAddToAlbum(album.id);
                      setShowAlbumPicker(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-left cursor-pointer"
                  >
                    {album.coverUrl ? (
                      <img src={album.coverUrl} alt={album.name} className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-white/10" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{album.name}</p>
                      <p className="text-[10px] text-zinc-400">{album.count} items</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowAlbumPicker(false)}
              className="w-full py-2.5 rounded-xl bg-white/10 text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-6">
          <div className="w-full max-w-sm bg-zinc-950 border border-red-500/30 rounded-3xl p-5 text-white space-y-4">
            <h3 className="text-sm font-bold">Delete {selectedCount} item(s)?</h3>
            <p className="text-xs text-zinc-400">
              This permanently deletes the selected photos/videos from your device storage. Android will ask you to
              confirm one more time.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirmDelete(false);
                  onDelete();
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
