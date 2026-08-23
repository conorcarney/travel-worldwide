import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import {
  addCountryToList,
  CountryListStoreError,
  countryListWriteSchema,
  removeCountryFromList,
} from "@/lib/country-list-store";
import { createCollectionGetHandler } from "@/lib/create-collection-handler";

export const GET = createCollectionGetHandler("countryList");

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const body: unknown = await request.json();
    const parsed = countryListWriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid country",
        },
        { status: 400 },
      );
    }

    const names = await addCountryToList(parsed.data);
    return NextResponse.json({ ok: true, data: names }, { status: 201 });
  } catch (error) {
    if (error instanceof CountryListStoreError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to add country";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const url = new URL(request.url);
    const parsed = countryListWriteSchema.safeParse({
      name: url.searchParams.get("name") ?? "",
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid country",
        },
        { status: 400 },
      );
    }

    const names = await removeCountryFromList(parsed.data.name);
    return NextResponse.json({ ok: true, data: names });
  } catch (error) {
    if (error instanceof CountryListStoreError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to remove country";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
