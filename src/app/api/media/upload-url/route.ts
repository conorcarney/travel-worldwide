import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import { createTripMediaUpload, isS3Configured, S3ConfigError } from "@/lib/s3/client";
import { mediaUploadRequestSchema } from "@/lib/validations/media-upload";

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  if (!isS3Configured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "S3 is not configured. Set AWS_S3_BUCKET and AWS_REGION.",
      },
      { status: 503 },
    );
  }

  try {
    const body: unknown = await request.json();
    const parsed = mediaUploadRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid upload",
        },
        { status: 400 },
      );
    }

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
    const message =
      error instanceof Error ? error.message : "Failed to create upload URL";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
