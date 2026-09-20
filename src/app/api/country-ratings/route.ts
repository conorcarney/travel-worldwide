import { createCollectionGetHandler } from "@/lib/create-collection-handler";
import { createAdminCreateHandler } from "@/lib/api/admin-handler";
import {
  countryRatingWriteSchema,
  createCountryRating,
} from "@/lib/country-ratings-store";

export const GET = createCollectionGetHandler("countryRatings");

export const POST = createAdminCreateHandler({
  schema: countryRatingWriteSchema,
  invalidMessage: "Invalid country rating",
  fallbackError: "Failed to create country rating",
  create: createCountryRating,
});
