import { createCollectionGetHandler } from "@/lib/create-collection-handler";
import { createAdminCreateHandler } from "@/lib/api/admin-handler";
import { createFlight, flightWriteSchema } from "@/lib/flights";

export const GET = createCollectionGetHandler("flights");

export const POST = createAdminCreateHandler({
  schema: flightWriteSchema,
  invalidMessage: "Invalid flight",
  fallbackError: "Failed to create flight",
  create: createFlight,
});
