import { ObjectId, type Db } from "mongodb";
import { COLLECTIONS } from "@/lib/collections";
import { serializeDocs } from "@/lib/data";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import {
  isPublicBlog,
  type BlogRecord,
  type BlogWriteInput,
} from "@/lib/validations/blog-write";

export {
  blogWriteSchema,
  briefBlogDescription,
  isPublicBlog,
  slugifyBlogUrl,
  type BlogRecord,
  type BlogWriteInput,
} from "@/lib/validations/blog-write";

export class BlogStoreError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "BlogStoreError";
    this.status = status;
  }
}

export async function requireBlogsDb(): Promise<Db> {
  if (!isMongoConfigured()) {
    throw new BlogStoreError("MongoDB is not configured", 503);
  }
  const db = await getDb();
  if (!db) {
    throw new BlogStoreError("MongoDB is not available", 503);
  }
  return db;
}

function blogsCollection(db: Db) {
  return db.collection(COLLECTIONS.blogs);
}

export function toBlogDocument(input: BlogWriteInput) {
  return {
    name: input.name,
    date_of_first_visit: input.date_of_first_visit,
    url: input.url,
    blog_title: input.blog_title,
    blog_description: input.blog_description,
    tags: input.tags ?? "",
  };
}

export async function listAllBlogs(): Promise<BlogRecord[]> {
  const db = await requireBlogsDb();
  const docs = await blogsCollection(db).find({}).limit(5000).toArray();
  return serializeDocs(docs) as BlogRecord[];
}

export async function listPublicBlogs(): Promise<BlogRecord[]> {
  const blogs = await listAllBlogs();
  return blogs
    .filter(isPublicBlog)
    .sort((a, b) =>
      (b.date_of_first_visit || "").localeCompare(a.date_of_first_visit || ""),
    );
}

export async function getBlogBySlug(slug: string): Promise<BlogRecord | null> {
  const db = await requireBlogsDb();
  const doc = await blogsCollection(db).findOne({ url: slug });
  if (!doc) return null;
  const [serialized] = serializeDocs([doc]) as BlogRecord[];
  return serialized ?? null;
}

export async function createBlog(input: BlogWriteInput): Promise<BlogRecord> {
  const db = await requireBlogsDb();
  const collection = blogsCollection(db);

  const existing = await collection.findOne({ url: input.url });
  if (existing) {
    throw new BlogStoreError("A blog with that URL slug already exists", 409);
  }

  const document = toBlogDocument(input);
  const result = await collection.insertOne(document);
  return {
    _id: String(result.insertedId),
    ...document,
  };
}

export async function updateBlog(
  id: string,
  input: BlogWriteInput,
): Promise<BlogRecord> {
  const db = await requireBlogsDb();
  if (!ObjectId.isValid(id)) {
    throw new BlogStoreError("Invalid blog id", 400);
  }

  const collection = blogsCollection(db);
  const objectId = new ObjectId(id);

  const slugTaken = await collection.findOne({
    url: input.url,
    _id: { $ne: objectId },
  });
  if (slugTaken) {
    throw new BlogStoreError("A blog with that URL slug already exists", 409);
  }

  const document = toBlogDocument(input);
  const result = await collection.findOneAndUpdate(
    { _id: objectId },
    { $set: document },
    { returnDocument: "after" },
  );

  if (!result) {
    throw new BlogStoreError("Blog not found", 404);
  }

  const [serialized] = serializeDocs([result]) as BlogRecord[];
  return serialized!;
}

export async function deleteBlog(id: string): Promise<void> {
  const db = await requireBlogsDb();
  if (!ObjectId.isValid(id)) {
    throw new BlogStoreError("Invalid blog id", 400);
  }
  const result = await blogsCollection(db).deleteOne({
    _id: new ObjectId(id),
  });
  if (result.deletedCount === 0) {
    throw new BlogStoreError("Blog not found", 404);
  }
}
