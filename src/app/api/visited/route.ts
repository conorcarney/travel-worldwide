import { createCollectionGetHandler } from "@/lib/create-collection-handler";
import { createAdminCreateHandler } from "@/lib/api/admin-handler";
import { createVisited, visitedWriteSchema } from "@/lib/visited";

export const GET = createCollectionGetHandler("visited");

export const POST = createAdminCreateHandler({
  schema: visitedWriteSchema,
  invalidMessage: "Invalid visited country",
  fallbackError: "Failed to create visited country",
  create: createVisited,
});
