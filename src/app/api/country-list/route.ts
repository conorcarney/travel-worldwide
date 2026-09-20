import { NextResponse } from "next/server";
import {
  createAdminCreateHandler,
  handleAdminAction,
  invalidWriteResponse,
} from "@/lib/api/admin-handler";
import {
  addCountryToList,
  countryListWriteSchema,
  removeCountryFromList,
} from "@/lib/country-list-store";
import { createCollectionGetHandler } from "@/lib/create-collection-handler";

export const GET = createCollectionGetHandler("countryList");

export const POST = createAdminCreateHandler({
  schema: countryListWriteSchema,
  invalidMessage: "Invalid country",
  fallbackError: "Failed to add country",
  create: addCountryToList,
});

export async function DELETE(request: Request) {
  return handleAdminAction("Failed to remove country", async () => {
    const url = new URL(request.url);
    const parsed = countryListWriteSchema.safeParse({
      name: url.searchParams.get("name") ?? "",
    });
    if (!parsed.success) {
      return invalidWriteResponse(parsed, "Invalid country");
    }

    const names = await removeCountryFromList(parsed.data.name);
    return NextResponse.json({ ok: true, data: names });
  });
}
