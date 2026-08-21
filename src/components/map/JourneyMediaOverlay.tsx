"use client";

import { useEffect, useState } from "react";
import { parseTripMedia, type TripMediaItem } from "@/lib/map/trip-media";

function MediaSlide({ item, title }: { item: TripMediaItem; title: string }) {
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
        src={item.url}
        className="h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
      />
    );
  }

  return <img src={item.url} alt={title} className="h-full w-full object-cover" />;
}

type JourneyMediaOverlayProps = {
  media: string | undefined;
  title: string;
};

const STEP_BUTTON =
  "flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/55 text-lg text-white hover:bg-black/75";

export function JourneyMediaOverlay({ media, title }: JourneyMediaOverlayProps) {
  const items = parseTripMedia(media);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [media]);

  if (items.length === 0) return null;

  const current = Math.min(index, items.length - 1);
  const item = items[current]!;
  const showPager = items.length > 1;

  function step(delta: number) {
    setIndex((value) => {
      const total = items.length;
      return (value + delta + total) % total;
    });
  }

  return (
    <aside
      className="pointer-events-auto absolute top-4 right-4 z-[1100] w-[min(94vw,36rem)] overflow-hidden rounded-xl border border-border bg-surface/95 shadow-lg"
      data-testid="journey-media"
    >
      <div className="relative aspect-video bg-black">
        <MediaSlide item={item} title={title} />
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
    </aside>
  );
}
