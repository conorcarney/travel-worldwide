import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  mediaObjectKey,
  publicObjectUrl,
  type AllowedTripMediaType,
} from "@/lib/s3/media";

export class S3ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "S3ConfigError";
  }
}

type S3Settings = {
  bucket: string;
  region: string;
  publicBaseUrl?: string;
};

function readS3Settings(): S3Settings {
  const bucket = process.env.AWS_S3_BUCKET?.trim();
  const region = process.env.AWS_REGION?.trim() || process.env.AWS_DEFAULT_REGION?.trim();
  const publicBaseUrl = process.env.AWS_S3_PUBLIC_BASE_URL?.trim();
  if (!bucket || !region) {
    throw new S3ConfigError(
      "S3 is not configured. Set AWS_S3_BUCKET and AWS_REGION.",
    );
  }
  return { bucket, region, publicBaseUrl: publicBaseUrl || undefined };
}

export function isS3Configured(): boolean {
  return Boolean(
    process.env.AWS_S3_BUCKET?.trim() &&
      (process.env.AWS_REGION?.trim() || process.env.AWS_DEFAULT_REGION?.trim()),
  );
}

function createS3Client(settings: S3Settings): S3Client {
  return new S3Client({
    region: settings.region,
    // Presigned browser PUTs have no body at sign time. Default CRC32
    // checksums sign an empty payload and the upload then fails in CORS.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

export async function createTripMediaUpload(input: {
  filename: string;
  contentType: AllowedTripMediaType;
  tripDate?: string;
}): Promise<{ key: string; uploadUrl: string; publicUrl: string }> {
  const settings = readS3Settings();
  const key = mediaObjectKey(input.filename, input.contentType, input.tripDate);
  const command = new PutObjectCommand({
    Bucket: settings.bucket,
    Key: key,
    ContentType: input.contentType,
  });
  const uploadUrl = await getSignedUrl(createS3Client(settings), command, {
    expiresIn: 120,
  });
  return {
    key,
    uploadUrl,
    publicUrl: publicObjectUrl(
      key,
      settings.bucket,
      settings.region,
      settings.publicBaseUrl,
    ),
  };
}
