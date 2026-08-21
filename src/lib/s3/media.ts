export const MAX_TRIP_MEDIA_BYTES = 80 * 1024 * 1024;

export const ALLOWED_TRIP_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export type AllowedTripMediaType = (typeof ALLOWED_TRIP_MEDIA_TYPES)[number];

const EXT_BY_TYPE: Record<AllowedTripMediaType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export function isAllowedTripMediaType(
  value: string,
): value is AllowedTripMediaType {
  return (ALLOWED_TRIP_MEDIA_TYPES as readonly string[]).includes(value);
}

const EXT_TO_TYPE: Record<string, AllowedTripMediaType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/mp4",
};

export function inferTripMediaType(
  filename: string,
  fileType: string,
): AllowedTripMediaType | null {
  if (isAllowedTripMediaType(fileType)) return fileType;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_TYPE[ext] ?? null;
}

export const TRIP_MEDIA_FILE_ACCEPT = [
  ...ALLOWED_TRIP_MEDIA_TYPES,
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
  ".mp4",
  ".webm",
  ".mov",
  ".m4v",
].join(",");

export function sanitizeMediaFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? "file";
  const withoutExt = base.replace(/\.[^.]+$/, "");
  const trimmed = withoutExt.trim().toLowerCase().replace(/\s+/g, "-");
  const safe = trimmed.replace(/[^a-z0-9._-]/g, "").replace(/^\.+/, "");
  return safe.slice(0, 80) || "file";
}

const MONTH_NAMES = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const;

export type TripDateParts = {
  year: number;
  month: number;
  day?: number;
};

function monthFromName(value: string): number {
  const token = value.slice(0, 3).toLowerCase();
  return MONTH_NAMES.indexOf(token as (typeof MONTH_NAMES)[number]) + 1;
}

function toTripDateParts(
  year: number,
  month: number,
  day?: number,
): TripDateParts | null {
  if (!Number.isFinite(year) || year < 1900 || year > 2100) return null;
  if (!Number.isFinite(month) || month < 1 || month > 12) return null;
  if (day === undefined) return { year, month };
  if (!Number.isFinite(day) || day < 1 || day > 31) return { year, month };
  return { year, month, day };
}

export function parseTripDateParts(value?: string): TripDateParts | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;

  const mapsMe = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (mapsMe) {
    return toTripDateParts(Number(mapsMe[1]), Number(mapsMe[2]), Number(mapsMe[3]));
  }

  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return toTripDateParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const dayMonthYear = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dayMonthYear) {
    return toTripDateParts(
      Number(dayMonthYear[3]),
      Number(dayMonthYear[2]),
      Number(dayMonthYear[1]),
    );
  }

  const namedDay = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/);
  if (namedDay) {
    return toTripDateParts(
      Number(namedDay[3]),
      monthFromName(namedDay[2]!),
      Number(namedDay[1]),
    );
  }

  const namedMonth = trimmed.match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
  if (namedMonth) {
    return toTripDateParts(Number(namedMonth[2]), monthFromName(namedMonth[1]!));
  }

  const monthYear = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
  if (monthYear) {
    return toTripDateParts(Number(monthYear[2]), Number(monthYear[1]));
  }

  const yearOnly = trimmed.match(/^(\d{4})$/);
  if (yearOnly) {
    return toTripDateParts(Number(yearOnly[1]), 1);
  }

  return null;
}

export function tripDateFolder(
  tripDate?: string,
  fallbackNow = new Date(),
): string {
  const parsed = parseTripDateParts(tripDate);
  const year = parsed?.year ?? fallbackNow.getUTCFullYear();
  const month = parsed?.month ?? fallbackNow.getUTCMonth() + 1;
  const day = parsed?.day;
  const parts = [
    "trips",
    String(year),
    String(month).padStart(2, "0"),
  ];
  if (day) parts.push(String(day).padStart(2, "0"));
  return parts.join("/");
}

export function mediaObjectKey(
  filename: string,
  contentType: AllowedTripMediaType,
  tripDate?: string,
  random = Math.random().toString(36).slice(2, 10),
  fallbackNow = new Date(),
): string {
  const folder = tripDateFolder(tripDate, fallbackNow);
  const safeName = sanitizeMediaFilename(filename);
  const ext = EXT_BY_TYPE[contentType];
  return `${folder}/${random}-${safeName}.${ext}`;
}

export function publicObjectUrl(
  key: string,
  bucket: string,
  region: string,
  publicBaseUrl?: string,
): string {
  const encodedKey = key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const base = publicBaseUrl?.replace(/\/$/, "");
  if (base) return `${base}/${encodedKey}`;
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
}
