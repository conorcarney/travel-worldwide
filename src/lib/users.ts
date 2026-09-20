import { ObjectId, type Db } from "mongodb";
import bcrypt from "bcryptjs";
import { COLLECTIONS } from "@/lib/collections";
import { serializeDocs } from "@/lib/data";
import { escapeRegex } from "@/lib/escape-regex";
import { requireConfiguredDb, StoreError } from "@/lib/store";
import {
  type PublicUserRecord,
  type UserWriteInput,
} from "@/lib/validations/user-write";

export {
  USER_ROLE_NAMES,
  userWriteSchema,
  type PublicUserRecord,
  type UserWriteInput,
} from "@/lib/validations/user-write";

export { StoreError as UserStoreError };

async function resolveRoleId(db: Db, roleName: string): Promise<ObjectId> {
  const role = await db.collection(COLLECTIONS.roles).findOne({
    name: { $regex: `^${roleName}$`, $options: "i" },
  });
  if (!role?._id) {
    throw new StoreError(`Role "${roleName}" was not found`, 500);
  }
  return new ObjectId(String(role._id));
}

export async function createUser(
  input: UserWriteInput,
  options: { allowElevatedRoles?: boolean } = {},
): Promise<PublicUserRecord> {
  const db = await requireConfiguredDb();
  const users = db.collection(COLLECTIONS.users);

  const roleName = options.allowElevatedRoles
    ? (input.role ?? "user")
    : "user";

  const existing = await users.findOne({
    $or: [
      { email: { $regex: `^${escapeRegex(input.email)}$`, $options: "i" } },
      {
        username: {
          $regex: `^${escapeRegex(input.username)}$`,
          $options: "i",
        },
      },
    ],
  });
  if (existing) {
    throw new StoreError(
      "An account with that email or username already exists",
      409,
    );
  }

  const roleId = await resolveRoleId(db, roleName);
  const passwordHash = await bcrypt.hash(input.password, 10);

  const document = {
    username: input.username,
    email: input.email.toLowerCase(),
    password: passwordHash,
    roles: [roleId],
    __v: 0,
  };

  const result = await users.insertOne(document);

  return {
    _id: String(result.insertedId),
    username: document.username,
    email: document.email,
    roles: [roleName.toLowerCase()],
  };
}

export async function listPublicUsers(): Promise<PublicUserRecord[]> {
  const db = await requireConfiguredDb();
  const users = await db
    .collection(COLLECTIONS.users)
    .find({}, { projection: { password: 0 } })
    .limit(5000)
    .toArray();

  const roleIds = users.flatMap((user) =>
    Array.isArray(user.roles)
      ? user.roles.map((role) => new ObjectId(String(role)))
      : [],
  );
  const roleDocs =
    roleIds.length > 0
      ? await db
          .collection(COLLECTIONS.roles)
          .find({ _id: { $in: roleIds } })
          .toArray()
      : [];
  const roleNameById = new Map(
    roleDocs.map((role) => [
      String(role._id),
      typeof role.name === "string" ? role.name.toLowerCase() : "user",
    ]),
  );

  return users.map((user) => {
    const roles = Array.isArray(user.roles)
      ? user.roles.map(
          (role) => roleNameById.get(String(role)) ?? "user",
        )
      : [];
    return {
      _id: String(user._id),
      username: String(user.username ?? ""),
      email: String(user.email ?? ""),
      roles,
    };
  });
}

export function sanitizeUserDocs(docs: unknown[]): PublicUserRecord[] {
  return (serializeDocs(docs) as Array<Record<string, unknown>>).map((user) => ({
    _id: String(user._id),
    username: String(user.username ?? ""),
    email: String(user.email ?? ""),
    roles: Array.isArray(user.roles)
      ? user.roles.map((role) => String(role))
      : [],
  }));
}
