"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { adjacentIndex, wrapIndex } from "@/lib/stats/carousel";

export type StatisticsCarouselSlide = {
  id: string;
  label: string;
  imageSrc: string;
  imageAlt: string;
  content: ReactNode;
};

type StatisticsCarouselProps = {
  slides: StatisticsCarouselSlide[];
  initialId?: string;
};

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === "left" ? (
        <path d="M15 18l-6-6 6-6" />
      ) : (
        <path d="M9 18l6-6-6-6" />
      )}
    </svg>
  );
}

export function StatisticsCarousel({
  slides,
  initialId,
}: StatisticsCarouselProps) {
  const labelId = useId();
  const heroRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const startIndex = useMemo(() => {
    const found = slides.findIndex((slide) => slide.id === initialId);
    return found >= 0 ? found : 0;
  }, [initialId, slides]);
  const [index, setIndex] = useState(startIndex);

  const count = slides.length;
  const current = count > 0 ? slides[wrapIndex(index, count)] : undefined;
  const canNavigate = count > 1;
  const previous = canNavigate
    ? slides[adjacentIndex(index, count, -1)]
    : undefined;
  const next = canNavigate ? slides[adjacentIndex(index, count, 1)] : undefined;

  const goTo = useCallback(
    (nextIndex: number) => {
      if (count <= 0) return;
      setIndex(wrapIndex(nextIndex, count));
      heroRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    },
    [count],
  );

  const goPrevious = useCallback(() => {
    goTo(adjacentIndex(index, count, -1));
  }, [count, goTo, index]);

  const goNext = useCallback(() => {
    goTo(adjacentIndex(index, count, 1));
  }, [count, goTo, index]);

  useEffect(() => {
    if (!canNavigate) return;

    function onKey(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevious();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canNavigate, goNext, goPrevious]);

  if (!current) return null;

  return (
    <div
      className="mt-8"
      data-testid="statistics-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-labelledby={labelId}
    >
      <p id={labelId} className="sr-only">
        Statistics views
      </p>
      <div
        ref={heroRef}
        className="relative overflow-hidden rounded-xl border border-border"
        onTouchStart={(event) => {
          touchStartX.current = event.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (!canNavigate || touchStartX.current == null) return;
          const endX = event.changedTouches[0]?.clientX;
          if (endX == null) return;
          const delta = endX - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(delta) < 48) return;
          if (delta > 0) goPrevious();
          else goNext();
        }}
      >
        <div className="relative h-56 sm:h-72 md:h-80">
          {slides.map((slide, slideIndex) => {
            const active = slide.id === current.id;
            return (
              <Image
                key={slide.id}
                src={slide.imageSrc}
                alt={slide.imageAlt}
                fill
                priority={slideIndex === startIndex}
                sizes="(max-width: 72rem) 100vw, 72rem"
                className={
                  active
                    ? "z-[1] object-cover object-center"
                    : "pointer-events-none invisible object-cover object-center"
                }
              />
            );
          })}
          <div
            aria-hidden
            className="absolute inset-0 z-[2] bg-gradient-to-t from-background/80 via-background/25 to-background/10"
          />
          <p
            className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2 px-16 text-center font-display text-3xl tracking-tight text-foreground sm:text-4xl"
            data-testid="statistics-carousel-title"
          >
            {current.label}
          </p>
        </div>

        {canNavigate ? (
          <>
            <button
              type="button"
              className="absolute top-1/2 left-3 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/75 text-foreground transition-colors hover:bg-accent hover:text-white"
              aria-label={`Previous: ${previous?.label ?? ""}`}
              data-testid="statistics-carousel-prev"
              onClick={goPrevious}
            >
              <Chevron direction="left" />
            </button>
            <button
              type="button"
              className="absolute top-1/2 right-3 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/75 text-foreground transition-colors hover:bg-accent hover:text-white"
              aria-label={`Next: ${next?.label ?? ""}`}
              data-testid="statistics-carousel-next"
              onClick={goNext}
            >
              <Chevron direction="right" />
            </button>
          </>
        ) : null}

        {canNavigate ? (
          <div
            className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2"
            data-testid="statistics-carousel-dots"
          >
            {slides.map((slide, slideIndex) => {
              const selected = slide.id === current.id;
              return (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Show ${slide.label}`}
                  aria-current={selected ? "true" : undefined}
                  data-testid={`statistics-carousel-dot-${slide.id}`}
                  className={
                    selected
                      ? "h-2.5 w-2.5 rounded-full bg-accent"
                      : "h-2.5 w-2.5 rounded-full bg-foreground/40 hover:bg-foreground/70"
                  }
                  onClick={() => goTo(slideIndex)}
                />
              );
            })}
          </div>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">
        {current.label}
      </p>

      {slides.map((slide) => {
        const active = slide.id === current.id;
        return (
          <div
            key={slide.id}
            id={`statistics-panel-${slide.id}`}
            role="group"
            aria-label={slide.label}
            hidden={!active}
            inert={!active ? true : undefined}
            data-testid={`statistics-panel-${slide.id}`}
          >
            {slide.content}
          </div>
        );
      })}
    </div>
  );
}
