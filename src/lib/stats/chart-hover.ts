import type { MouseEvent } from "react";

export type HoverTip = {
  x: number;
  y: number;
  title: string;
  detail: string;
};

export function tipFromMouse(
  event: MouseEvent<Element>,
  host: HTMLElement | null,
  title: string,
  detail: string,
): HoverTip | null {
  if (!host) return null;
  const box = host.getBoundingClientRect();
  return {
    x: event.clientX - box.left + 12,
    y: event.clientY - box.top - 40,
    title,
    detail,
  };
}

export function goToMap(
  event: MouseEvent<HTMLElement>,
  href: string,
  push: (url: string) => void,
) {
  if (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  ) {
    return;
  }
  event.preventDefault();
  push(href);
}
