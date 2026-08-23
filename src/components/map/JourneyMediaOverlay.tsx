"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  DEFAULT_MEDIA_ASPECT,
  fitMediaBox,
  parseTripMedia,
  type TripMediaItem,
} from "@/lib/map/trip-media";

type MediaSize = { width: number; height: number };

function MediaSlide({
  item,
  title,
  onNaturalSize,
}: {
  item: TripMediaItem;
  title: string;
  onNaturalSize: (size: MediaSize) => void;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useLayoutEffect(() => {
    if (item.kind === "youtube" || item.kind === "vimeo") {
      onNaturalSize({
        width: DEFAULT_MEDIA_ASPECT * 100,
        height: 100,
      });
      return;
    }

    if (item.kind === "video") {
      const video = videoRef.current;
      if (video && video.videoWidth > 0 && video.videoHeight > 0) {
        onNaturalSize({
          width: video.videoWidth,
          height: video.videoHeight,
        });
      }
      return;
    }

    const image = imageRef.current;
    if (image && image.complete && image.naturalWidth > 0) {
      onNaturalSize({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    }
  }, [item, onNaturalSize]);

  if (item.kind === "youtube" || item.kind === "vimeo") {
    return (
      <iframe
        src={item.embedUrl}
        title={title}
        className="h-full w-full border-0"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  }

  if (item.kind === "video") {
    return (
      <video
        ref={videoRef}
        src={item.url}
        className="h-full w-full object-contain"
        autoPlay
        muted
        loop
        playsInline
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            onNaturalSize({
              width: video.videoWidth,
              height: video.videoHeight,
            });
          }
        }}
      />
    );
  }

  return (
    <img
      ref={imageRef}
      src={item.url}
      alt={title}
      className="h-full w-full object-contain"
      onLoad={(event) => {
        const image = event.currentTarget;
        if (image.naturalWidth > 0 && image.naturalHeight > 0) {
          onNaturalSize({
            width: image.naturalWidth,
            height: image.naturalHeight,
          });
        }
      }}
    />
  );
}

type JourneyMediaOverlayProps = {
  media: string | undefined;
  title: string;
  mode: string;
  tags?: string[];
};

const STEP_BUTTON =
  "flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/55 text-lg text-white hover:bg-black/75";

const CAPTION_ONLY_WIDTH = 320;

export function JourneyMediaOverlay({
  media,
  title,
  mode,
  tags = [],
}: JourneyMediaOverlayProps) {
  const items = parseTripMedia(media);
  const [index, setIndex] = useState(0);
  const [mapSize, setMapSize] = useState<MediaSize>({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState<MediaSize | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const hasMedia = items.length > 0;

  const reportNaturalSize = useCallback((size: MediaSize) => {
    setNaturalSize((prev) => {
      if (
        prev &&
        prev.width === size.width &&
        prev.height === size.height
      ) {
        return prev;
      }
      return size;
    });
  }, []);

  useEffect(() => {
    setIndex(0);
    setNaturalSize(null);
  }, [media]);

  useEffect(() => {
    setNaturalSize(null);
  }, [index]);

  useEffect(() => {
    const host = rootRef.current?.offsetParent;
    if (!(host instanceof HTMLElement)) return;

    const measure = () => {
      setMapSize((prev) => {
        const next = {
          width: host.clientWidth,
          height: host.clientHeight,
        };
        if (prev.width === next.width && prev.height === next.height) {
          return prev;
        }
        return next;
      });
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [hasMedia]);

  const current = Math.min(index, Math.max(items.length - 1, 0));
  const item = hasMedia ? items[current]! : null;
  const showPager = items.length > 1;

  const mediaWidth = naturalSize?.width ?? DEFAULT_MEDIA_ASPECT * 100;
  const mediaHeight = naturalSize?.height ?? 100;

  const box =
    hasMedia && mapSize.width > 0 && mapSize.height > 0
      ? fitMediaBox(mapSize.width, mapSize.height, mediaWidth, mediaHeight)
      : hasMedia
        ? {
            width: 420,
            height: Math.round(420 / DEFAULT_MEDIA_ASPECT),
          }
        : { width: CAPTION_ONLY_WIDTH, height: 0 };

  function step(delta: number) {
    setIndex((value) => {
      const total = items.length;
      return (value + delta + total) % total;
    });
  }

  return (
    <aside
      ref={rootRef}
      className="pointer-events-auto absolute top-4 right-4 z-[1100] flex flex-col overflow-hidden rounded-xl border border-border bg-surface/95 shadow-lg"
      style={{ width: box.width }}
      data-testid="journey-media"
    >
      {item ? (
        <div
          className="relative bg-neutral-500"
          style={{ width: box.width, height: box.height }}
        >
          <MediaSlide
            key={`${item.url}-${current}`}
            item={item}
            title={title}
            onNaturalSize={reportNaturalSize}
          />
          {showPager ? (
            <>
              <button
                type="button"
                className={`${STEP_BUTTON} absolute top-1/2 left-2 -translate-y-1/2`}
                onClick={() => step(-1)}
                aria-label="Previous photo"
                data-testid="journey-media-prev"
              >
                ‹
              </button>
              <button
                type="button"
                className={`${STEP_BUTTON} absolute top-1/2 right-2 -translate-y-1/2`}
                onClick={() => step(1)}
                aria-label="Next photo"
                data-testid="journey-media-next"
              >
                ›
              </button>
              <p
                className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2.5 py-0.5 text-xs text-white"
                data-testid="journey-media-count"
              >
                {current + 1} / {items.length}
              </p>
            </>
          ) : null}
        </div>
      ) : null}

      <p
        className="px-4 py-2 text-foreground"
        data-testid="journey-caption"
        aria-live="polite"
      >
        <span className="block text-base sm:text-lg">
          <span className="capitalize">{mode}</span>
          {": "}
          {title}
        </span>
        {tags.length > 0 ? (
          <span className="mt-1 block text-sm text-muted">
            {tags.join(" · ")}
          </span>
        ) : null}
      </p>
    </aside>
  );
}
