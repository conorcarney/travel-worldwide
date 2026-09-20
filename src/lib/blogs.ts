import { type Db } from "mongodb";
import { COLLECTIONS } from "@/lib/collections";
import { serializeDocs } from "@/lib/data";
import { sortBlogs } from "@/lib/blog-sort";
import { parseObjectId, requireConfiguredDb, StoreError } from "@/lib/store";
import {
  isPublicBlog,
  type BlogRecord,
  type BlogWriteInput,
} from "@/lib/validations/blog-write";

export {
  blogWriteSchema,
  briefBlogDescription,
  canAccessBlog,
  isPublicBlog,
  slugifyBlogUrl,
  type BlogRecord,
  type BlogWriteInput,
} from "@/lib/validations/blog-write";

export { StoreError as BlogStoreError };

function blogsCollection(db: Db) {
  return db.collection(COLLECTIONS.blogs);
}

function blogId(id: string) {
  return parseObjectId(id, "Invalid blog id");
}

export function toBlogDocument(input: BlogWriteInput) {
  return {
    name: input.name,
    date_of_first_visit: input.date_of_first_visit,
    date_of_story: input.date_of_story ?? "",
    url: input.url,
    blog_title: input.blog_title,
    blog_description: input.blog_description,
    tags: input.tags ?? "",
  };
}

export async function listAllBlogs(): Promise<BlogRecord[]> {
  const db = await requireConfiguredDb();
  const docs = await blogsCollection(db).find({}).limit(5000).toArray();
  return serializeDocs(docs) as BlogRecord[];
}

export async function listPublicBlogs(): Promise<BlogRecord[]> {
  const blogs = await listAllBlogs();
  return sortBlogs(blogs.filter(isPublicBlog));
}

export async function getBlogBySlug(slug: string): Promise<BlogRecord | null> {
  const db = await requireConfiguredDb();
  const doc = await blogsCollection(db).findOne({ url: slug });
  if (!doc) return null;
  const [serialized] = serializeDocs([doc]) as BlogRecord[];
  return serialized ?? null;
}

export async function createBlog(input: BlogWriteInput): Promise<BlogRecord> {
  const db = await requireConfiguredDb();
  const collection = blogsCollection(db);

  const existing = await collection.findOne({ url: input.url });
  if (existing) {
    throw new StoreError("A blog with that URL slug already exists", 409);
  }

  const createdAt = new Date();
  const document = {
    ...toBlogDocument(input),
    created_at: createdAt,
  };
  const result = await collection.insertOne(document);
  return {
    _id: String(result.insertedId),
    ...toBlogDocument(input),
    created_at: createdAt.toISOString(),
  };
}

export async function updateBlog(
  id: string,
  input: BlogWriteInput,
): Promise<BlogRecord> {
  const db = await requireConfiguredDb();
  const collection = blogsCollection(db);
  const objectId = blogId(id);

  const slugTaken = await collection.findOne({
    url: input.url,
    _id: { $ne: objectId },
  });
  if (slugTaken) {
    throw new StoreError("A blog with that URL slug already exists", 409);
  }

  const document = toBlogDocument(input);
  const result = await collection.findOneAndUpdate(
    { _id: objectId },
    { $set: document },
    { returnDocument: "after" },
  );

  if (!result) {
    throw new StoreError("Blog not found", 404);
  }

  const [serialized] = serializeDocs([result]) as BlogRecord[];
  return serialized!;
}

export async function deleteBlog(id: string): Promise<void> {
  const db = await requireConfiguredDb();
  const result = await blogsCollection(db).deleteOne({
    _id: blogId(id),
  });
  if (result.deletedCount === 0) {
    throw new StoreError("Blog not found", 404);
  }
}
