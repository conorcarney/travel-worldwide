import {
  createAdminDeleteHandler,
  createAdminUpdateHandler,
} from "@/lib/api/admin-handler";
import {
  deleteVisited,
  updateVisited,
  visitedWriteSchema,
} from "@/lib/visited";

export const PUT = createAdminUpdateHandler({
  schema: visitedWriteSchema,
  invalidMessage: "Invalid visited country",
  fallbackError: "Failed to update visited country",
  update: updateVisited,
});

export const DELETE = createAdminDeleteHandler({
  fallbackError: "Failed to delete visited country",
  remove: deleteVisited,
});
