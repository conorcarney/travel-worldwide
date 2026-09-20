import {
  createAdminDeleteHandler,
  createAdminUpdateHandler,
} from "@/lib/api/admin-handler";
import { blogWriteSchema, deleteBlog, updateBlog } from "@/lib/blogs";

export const PUT = createAdminUpdateHandler({
  schema: blogWriteSchema,
  invalidMessage: "Invalid blog",
  fallbackError: "Failed to update blog",
  update: updateBlog,
});

export const DELETE = createAdminDeleteHandler({
  fallbackError: "Failed to delete blog",
  remove: deleteBlog,
});
