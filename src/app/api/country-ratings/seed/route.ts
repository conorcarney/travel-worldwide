import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import {
  CountryRatingStoreError,
  seedCountryRatings,
} from "@/lib/country-ratings-store";

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      force?: boolean;
    };
    const result = await seedCountryRatings(Boolean(body.force));
    return NextResponse.json({ ok: true, data: result });
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
        : "Failed to seed country ratings";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
