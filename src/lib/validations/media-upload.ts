import { z } from "zod";
import {
  ALLOWED_TRIP_MEDIA_TYPES,
  MAX_TRIP_MEDIA_BYTES,
} from "@/lib/s3/media";

export const mediaUploadRequestSchema = z.object({
  filename: z.string().trim().min(1, "Filename is required").max(200),
  contentType: z.enum(ALLOWED_TRIP_MEDIA_TYPES),
  size: z
    .number()
    .int()
    .positive()
    .max(MAX_TRIP_MEDIA_BYTES, "File is too large (80 MB max)"),
  tripDate: z.string().trim().max(64).optional(),
});

export type MediaUploadRequest = z.infer<typeof mediaUploadRequestSchema>;
