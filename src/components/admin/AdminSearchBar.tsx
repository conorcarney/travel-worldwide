"use client";

type AdminSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  testId?: string;
};

export function AdminSearchBar({
  value,
  onChange,
  placeholder,
  testId,
}: AdminSearchBarProps) {
  return (
    <label className="flex min-w-[12rem] flex-1 max-w-sm flex-col gap-1 text-sm text-muted">
      <span className="sr-only">Search</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded border border-border bg-background px-3 py-2 text-foreground"
        data-testid={testId}
      />
    </label>
  );
}
