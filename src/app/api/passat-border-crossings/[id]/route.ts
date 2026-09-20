import {
  createAdminDeleteHandler,
  createAdminUpdateHandler,
} from "@/lib/api/admin-handler";
import {
  deletePassatBorderCrossing,
  passatBorderCrossingWriteSchema,
  updatePassatBorderCrossing,
} from "@/lib/passat-border-crossings-store";

export const PUT = createAdminUpdateHandler({
  schema: passatBorderCrossingWriteSchema,
  invalidMessage: "Invalid border crossing",
  fallbackError: "Failed to update border crossing",
  update: updatePassatBorderCrossing,
});

export const DELETE = createAdminDeleteHandler({
  fallbackError: "Failed to delete border crossing",
  remove: deletePassatBorderCrossing,
});
