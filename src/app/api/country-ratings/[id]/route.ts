import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import {
  CountryRatingStoreError,
  countryRatingWriteSchema,
  deleteCountryRating,
  updateCountryRating,
} from "@/lib/country-ratings-store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const { id } = await context.params;
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

    const rating = await updateCountryRating(id, parsed.data);
    return NextResponse.json({ ok: true, data: rating });
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
        : "Failed to update country rating";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const { id } = await context.params;
    await deleteCountryRating(id);
    return NextResponse.json({ ok: true });
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
        : "Failed to delete country rating";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
