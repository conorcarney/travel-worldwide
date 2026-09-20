import {
  createAdminDeleteHandler,
  createAdminUpdateHandler,
} from "@/lib/api/admin-handler";
import {
  countryRatingWriteSchema,
  deleteCountryRating,
  updateCountryRating,
} from "@/lib/country-ratings-store";

export const PUT = createAdminUpdateHandler({
  schema: countryRatingWriteSchema,
  invalidMessage: "Invalid country rating",
  fallbackError: "Failed to update country rating",
  update: updateCountryRating,
});

export const DELETE = createAdminDeleteHandler({
  fallbackError: "Failed to delete country rating",
  remove: deleteCountryRating,
});
