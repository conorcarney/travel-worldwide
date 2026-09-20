import { createCollectionGetHandler } from "@/lib/create-collection-handler";
import { createAdminCreateHandler } from "@/lib/api/admin-handler";
import {
  createSurfaceRoute,
  surfaceRouteWriteSchema,
} from "@/lib/surface-routes";

export const maxDuration = 60;

export const GET = createCollectionGetHandler("busesTrainsAndFerries");

export const POST = createAdminCreateHandler({
  schema: surfaceRouteWriteSchema,
  invalidMessage: "Invalid route",
  fallbackError: "Failed to create route",
  create: createSurfaceRoute,
  toResponse: ({ route, encodedSource }) => ({ data: route, encodedSource }),
});
