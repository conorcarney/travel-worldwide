import {
  inferTripMediaType,
  MAX_TRIP_MEDIA_BYTES,
} from "@/lib/s3/media";

type UploadUrlResponse = {
  ok: boolean;
  error?: string;
  data?: {
    uploadUrl: string;
    publicUrl: string;
  };
};

export function appendMediaUrl(current: string, url: string): string {
  const trimmed = current.trim();
  return trimmed ? `${trimmed}\n${url}` : url;
}

export async function uploadTripMediaFile(
  file: File,
  tripDate?: string,
): Promise<string> {
  const contentType = inferTripMediaType(file.name, file.type);
  if (!contentType) {
    throw new Error(`Unsupported file type: ${file.name}`);
  }
  if (file.size > MAX_TRIP_MEDIA_BYTES) {
    throw new Error(`${file.name} is too large (80 MB max)`);
  }

  const response = await fetch("/api/media/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType,
      size: file.size,
      tripDate: tripDate?.trim() || undefined,
    }),
  });
  const payload = (await response.json()) as UploadUrlResponse;
  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error ?? "Could not start upload");
  }

  const put = await fetch(payload.data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!put.ok) {
    throw new Error(
      "S3 upload failed. Check bucket CORS allows PUT from this origin.",
    );
  }

  return payload.data.publicUrl;
}
