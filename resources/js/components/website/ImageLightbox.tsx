import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface LightboxImage {
  url: string;
  title?: string;
  caption?: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  initialIndex: number;
  onClose: () => void;
  albumTitle?: string;
}

export default function ImageLightbox({ images, initialIndex, onClose, albumTitle }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose, goPrev, goNext]);

  const current = images[currentIndex];
  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={onClose}>
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); goPrev(); }}
        className="absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); goNext(); }}
        className="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="flex max-h-[85vh] max-w-[90vw] flex-col items-center" onClick={(e) => e.stopPropagation()}>
        {albumTitle && (
          <div className="mb-4 text-center">
            <p className="text-lg font-bold text-white">{albumTitle}</p>
            <p className="mt-1 text-xs text-white/50">{currentIndex + 1} of {images.length}</p>
          </div>
        )}
        <img
          src={current.url}
          alt={current.title || current.caption || ''}
          className="max-h-[72vh] max-w-full rounded-lg object-contain shadow-2xl"
        />
        {(current.title || current.caption) && (
          <div className="mt-4 max-w-2xl text-center">
            {current.title && <p className="text-lg font-semibold text-white">{current.title}</p>}
            {current.caption && <p className="mt-1 text-sm text-white/70">{current.caption}</p>}
          </div>
        )}
        {!albumTitle && images.length > 1 && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-white/60">
              {currentIndex + 1} / {images.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
