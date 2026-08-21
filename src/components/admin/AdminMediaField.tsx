"use client";

import { useImperativeHandle, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, Ref } from "react";
import { TRIP_MEDIA_FILE_ACCEPT } from "@/lib/s3/media";
import { appendMediaUrl, uploadTripMediaFile } from "@/lib/s3/upload-client";
import { TRIP_MEDIA_HINT } from "@/lib/map/trip-media";

export type AdminMediaFieldHandle = {
  flushUploads: (tripDate?: string) => Promise<string>;
  clearPending: () => void;
};

type AdminMediaFieldProps = {
  ref?: Ref<AdminMediaFieldHandle | null>;
  value: string;
  onChange: (value: string) => void;
  tripDate?: string;
  disabled?: boolean;
  compact?: boolean;
  testId: string;
};

export function AdminMediaField({
  ref,
  value,
  onChange,
  tripDate,
  disabled = false,
  compact = false,
  testId,
}: AdminMediaFieldProps) {
  const valueRef = useRef(value);
  valueRef.current = value;

  const pendingRef = useRef<File[]>([]);
  const [pending, setPending] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function setPendingFiles(files: File[]) {
    pendingRef.current = files;
    setPending(files);
  }

  useImperativeHandle(ref, () => ({
    async flushUploads(uploadTripDate = tripDate) {
      const files = pendingRef.current;
      if (files.length === 0) return valueRef.current;

      setBusy(true);
      setError(null);
      try {
        let next = valueRef.current;
        for (const file of files) {
          const publicUrl = await uploadTripMediaFile(file, uploadTripDate);
          next = appendMediaUrl(next, publicUrl);
        }
        setPendingFiles([]);
        onChange(next);
        return next;
      } catch (uploadError) {
        const message =
          uploadError instanceof Error ? uploadError.message : "Upload failed";
        setError(message);
        throw uploadError;
      } finally {
        setBusy(false);
      }
    },
    clearPending() {
      setPendingFiles([]);
      setError(null);
    },
  }));

  function queueFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setError(null);
    setPendingFiles([...pendingRef.current, ...list]);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (files) queueFiles(files);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (disabled || busy) return;
    queueFiles(event.dataTransfer.files);
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`rounded border border-dashed px-3 py-3 text-sm ${
          dragging
            ? "border-accent bg-accent/10"
            : "border-border bg-background"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && !busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <p className={compact ? "text-xs text-muted" : "text-muted"}>
          {busy
            ? "Uploading to S3…"
            : "Drop photos or short videos here. They upload to S3 when you click Save."}
        </p>
        <label className="mt-2 inline-flex">
          <span className="cursor-pointer rounded-md border border-border px-3 py-1 text-xs text-foreground hover:bg-background/80">
            Choose files
          </span>
          <input
            type="file"
            className="sr-only"
            accept={TRIP_MEDIA_FILE_ACCEPT}
            multiple
            disabled={disabled || busy}
            onChange={onFileChange}
            data-testid={`${testId}-files`}
          />
        </label>
        {pending.length > 0 ? (
          <ul className="mt-2 space-y-1 text-xs text-foreground">
            {pending.map((file, index) => (
              <li
                key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  className="shrink-0 text-muted hover:text-foreground"
                  disabled={disabled || busy}
                  onClick={() =>
                    setPendingFiles(pendingRef.current.filter((_, i) => i !== index))
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <textarea
        className={
          compact
            ? "min-h-[4.5rem] w-full rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
            : "min-h-[5.5rem] rounded border border-border bg-background px-3 py-2 text-foreground"
        }
        value={value}
        disabled={disabled || busy}
        onChange={(event) => onChange(event.target.value)}
        placeholder={TRIP_MEDIA_HINT}
        data-testid={testId}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
