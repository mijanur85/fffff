import React, { useState, useEffect, useRef } from 'react';
import { MediaItem } from '../types';
import { MediaService } from '../services/media';

// Loads a single item's real thumbnail only once it's actually scrolled into
// view, instead of the whole library generating/downloading thumbnails up
// front. This is what keeps scans fast and scrolling smooth, and it's what
// makes video thumbnails actually show up (a raw video file can't be used
// directly as an <img> source).
export const LazyThumb: React.FC<{ item: MediaItem; alt: string; className: string }> = React.memo(
  ({ item, alt, className }) => {
    const [src, setSrc] = useState<string>(item.thumbnailUrl || '');
    const ref = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
      if (src) return; // already have a real thumbnail
      const el = ref.current;
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        },
        { rootMargin: '400px 0px' } // start loading a bit before it's on screen
      );
      observer.observe(el);
      return () => observer.disconnect();
    }, [src]);

    useEffect(() => {
      if (!inView || src || item.mediaId == null) return;
      let cancelled = false;
      MediaService.getThumbnail(item.mediaId, item.type === 'video').then((url) => {
        if (!cancelled && url) setSrc(url);
      });
      return () => {
        cancelled = true;
      };
    }, [inView, src, item.mediaId, item.type]);

    return (
      <div ref={ref} className={`${className} bg-white/5`}>
        {src ? (
          <img src={src} alt={alt} decoding="async" loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full animate-pulse bg-gradient-to-br from-white/5 to-white/10" />
        )}
      </div>
    );
  },
  (prev, next) => prev.item.id === next.item.id && prev.item.thumbnailUrl === next.item.thumbnailUrl
);
