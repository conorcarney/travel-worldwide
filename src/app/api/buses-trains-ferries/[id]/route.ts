import {
  createAdminDeleteHandler,
  createAdminUpdateHandler,
} from "@/lib/api/admin-handler";
import {
  deleteSurfaceRoute,
  surfaceRouteWriteSchema,
  updateSurfaceRoute,
} from "@/lib/surface-routes";

export const maxDuration = 60;

export const PUT = createAdminUpdateHandler({
  schema: surfaceRouteWriteSchema,
  invalidMessage: "Invalid route",
  fallbackError: "Failed to update route",
  update: updateSurfaceRoute,
  toResponse: ({ route, encodedSource }) => ({ data: route, encodedSource }),
});

export const DELETE = createAdminDeleteHandler({
  fallbackError: "Failed to delete route",
  remove: deleteSurfaceRoute,
});
