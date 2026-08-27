import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import {
  CountryRatingStoreError,
  countryRatingWriteSchema,
  createCountryRating,
} from "@/lib/country-ratings-store";
import { createCollectionGetHandler } from "@/lib/create-collection-handler";

export const GET = createCollectionGetHandler("countryRatings");

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const body: unknown = await request.json();
    const parsed = countryRatingWriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid country rating",
        },
        { status: 400 },
      );
    }

    const rating = await createCountryRating(parsed.data);
    return NextResponse.json({ ok: true, data: rating }, { status: 201 });
  } catch (error) {
    if (error instanceof CountryRatingStoreError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create country rating";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
