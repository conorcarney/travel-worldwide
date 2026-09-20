import { createCollectionGetHandler } from "@/lib/create-collection-handler";
import { createAdminCreateHandler } from "@/lib/api/admin-handler";
import {
  createPassatBorderCrossing,
  passatBorderCrossingWriteSchema,
} from "@/lib/passat-border-crossings-store";

export const GET = createCollectionGetHandler("passatBorderCrossings");

export const POST = createAdminCreateHandler({
  schema: passatBorderCrossingWriteSchema,
  invalidMessage: "Invalid border crossing",
  fallbackError: "Failed to create border crossing",
  create: createPassatBorderCrossing,
});
