import {
  createAdminDeleteHandler,
  createAdminUpdateHandler,
} from "@/lib/api/admin-handler";
import {
  deleteFlight,
  flightWriteSchema,
  updateFlight,
} from "@/lib/flights";

export const PUT = createAdminUpdateHandler({
  schema: flightWriteSchema,
  invalidMessage: "Invalid flight",
  fallbackError: "Failed to update flight",
  update: updateFlight,
});

export const DELETE = createAdminDeleteHandler({
  fallbackError: "Failed to delete flight",
  remove: deleteFlight,
});
