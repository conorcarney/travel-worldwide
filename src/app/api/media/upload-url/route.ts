import { NextResponse } from "next/server";
import {
  handleAdminAction,
  parseWriteBody,
  storeErrorResponse,
} from "@/lib/api/admin-handler";
import { createTripMediaUpload, isS3Configured, S3ConfigError } from "@/lib/s3/client";
import { mediaUploadRequestSchema } from "@/lib/validations/media-upload";

export async function POST(request: Request) {
  return handleAdminAction("Failed to create upload URL", async () => {
    if (!isS3Configured()) {
      return NextResponse.json(
        {
          ok: false,
          error: "S3 is not configured. Set AWS_S3_BUCKET and AWS_REGION.",
        },
        { status: 503 },
      );
    }

    const parsed = await parseWriteBody(
      request,
      mediaUploadRequestSchema,
      "Invalid upload",
    );
    if ("response" in parsed) return parsed.response;

    try {
      const { filename, contentType, tripDate } = parsed.data;
      const upload = await createTripMediaUpload({
        filename,
        contentType,
        tripDate,
      });
      return NextResponse.json({ ok: true, data: upload });
    } catch (error) {
      if (error instanceof S3ConfigError) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 503 },
        );
      }
      return storeErrorResponse(error, "Failed to create upload URL");
    }
  });
}
