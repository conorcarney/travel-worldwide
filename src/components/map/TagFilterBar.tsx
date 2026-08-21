"use client";

import { useMemo, useState } from "react";
import type { KeyboardEvent } from "react";

type TagFilterBarProps = {
  selected: string[];
  options: string[];
  onChange: (tags: string[]) => void;
};

export function TagFilterBar({ selected, options, onChange }: TagFilterBarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const selectedKeys = new Set(selected.map((tag) => tag.toLowerCase()));

  const suggestions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return options
      .filter((tag) => !selectedKeys.has(tag.toLowerCase()))
      .filter((tag) => (needle ? tag.toLowerCase().includes(needle) : true))
      .slice(0, 8);
  }, [options, query, selected]);

  function addTag(tag: string) {
    if (selectedKeys.has(tag.toLowerCase())) return;
    onChange([...selected, tag]);
    setQuery("");
    setHighlight(0);
    setOpen(false);
  }

  function removeTag(tag: string) {
    onChange(selected.filter((item) => item.toLowerCase() !== tag.toLowerCase()));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && query === "" && selected.length > 0) {
      event.preventDefault();
      onChange(selected.slice(0, -1));
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setHighlight((current) => (current + 1) % suggestions.length);
      return;
    }
    if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setHighlight(
        (current) => (current - 1 + suggestions.length) % suggestions.length,
      );
      return;
    }
    if (event.key === "Enter" && open && suggestions[highlight]) {
      event.preventDefault();
      addTag(suggestions[highlight]!);
    }
  }

  return (
    <div className="relative min-w-[14rem] flex-1 max-w-md" data-testid="tag-filter">
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5">
        {selected.map((tag) => (
          <button
            key={tag}
            type="button"
            className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-foreground"
            onClick={() => removeTag(tag)}
            aria-label={`Remove tag ${tag}`}
          >
            {tag}
            <span aria-hidden>×</span>
          </button>
        ))}
        <input
          type="search"
          value={query}
          placeholder={selected.length === 0 ? "Search tags" : "Add tag"}
          className="min-w-[8rem] flex-1 bg-transparent text-sm text-foreground outline-none"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={onKeyDown}
          aria-autocomplete="list"
          aria-expanded={open}
          data-testid="tag-filter-input"
        />
      </div>
      {open && suggestions.length > 0 ? (
        <ul
          className="absolute z-[1200] mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-surface py-1 shadow"
          role="listbox"
        >
          {suggestions.map((tag, index) => (
            <li key={tag}>
              <button
                type="button"
                role="option"
                aria-selected={index === highlight}
                className={`block w-full px-3 py-1.5 text-left text-sm ${
                  index === highlight
                    ? "bg-accent/15 text-foreground"
                    : "text-foreground hover:bg-accent/10"
                }`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => addTag(tag)}
              >
                {tag}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
