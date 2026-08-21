"use client";

import type {
  InputHTMLAttributes,
  KeyboardEvent,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const FIELD_CLASS =
  "w-full min-w-[5.5rem] rounded border border-border bg-background px-2 py-1 text-sm text-foreground";

type InlineKeys = {
  onSave?: () => void;
  onCancel?: () => void;
};

function handleInlineKeys(
  event: KeyboardEvent<HTMLElement>,
  onSave?: () => void,
  onCancel?: () => void,
) {
  if (event.key === "Enter" && onSave) {
    event.preventDefault();
    onSave();
  }
  if (event.key === "Escape" && onCancel) {
    event.preventDefault();
    onCancel();
  }
}

export function AdminInlineField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex min-w-[5.5rem] flex-col gap-0.5 text-[0.7rem] text-muted">
      {label}
      {children}
    </label>
  );
}

export function AdminInlineInput({
  onSave,
  onCancel,
  onKeyDown,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & InlineKeys) {
  return (
    <input
      {...props}
      className={className ? `${FIELD_CLASS} ${className}` : FIELD_CLASS}
      onKeyDown={(event) => {
        handleInlineKeys(event, onSave, onCancel);
        onKeyDown?.(event);
      }}
    />
  );
}

export function AdminInlineSelect({
  onSave,
  onCancel,
  onKeyDown,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & InlineKeys) {
  return (
    <select
      {...props}
      className={className ? `${FIELD_CLASS} ${className}` : FIELD_CLASS}
      onKeyDown={(event) => {
        handleInlineKeys(event, onSave, onCancel);
        onKeyDown?.(event);
      }}
    />
  );
}

export function AdminInlineTextarea({
  onSave: _onSave,
  onCancel,
  onKeyDown,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & InlineKeys) {
  return (
    <textarea
      {...props}
      className={className ? `${FIELD_CLASS} ${className}` : FIELD_CLASS}
      onKeyDown={(event) => {
        if (event.key === "Escape" && onCancel) {
          event.preventDefault();
          onCancel();
        }
        onKeyDown?.(event);
      }}
    />
  );
}
