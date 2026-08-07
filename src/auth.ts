import { ObjectId } from "mongodb";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { COLLECTIONS } from "@/lib/collections";
import { getDb } from "@/lib/mongodb";

const credentialsSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const db = await getDb();
        if (!db) return null;

        const identifier = parsed.data.email;
        const user = await db.collection(COLLECTIONS.users).findOne({
          $or: [{ email: identifier }, { username: identifier }],
        });

        if (!user || typeof user.password !== "string") {
          return null;
        }

        const passwordMatches = await bcrypt.compare(
          parsed.data.password,
          user.password,
        );
        if (!passwordMatches) {
          return null;
        }

        const roleIds = Array.isArray(user.roles)
          ? user.roles
              .map((role) => {
                try {
                  return new ObjectId(String(role));
                } catch {
                  return null;
                }
              })
              .filter((id): id is ObjectId => id !== null)
          : [];

        const roleDocs =
          roleIds.length > 0
            ? await db
                .collection(COLLECTIONS.roles)
                .find({ _id: { $in: roleIds } })
                .toArray()
            : [];

        const roles = roleDocs
          .map((role) =>
            typeof role.name === "string" ? role.name.toLowerCase() : "",
          )
          .filter(Boolean);

        return {
          id: String(user._id),
          email: typeof user.email === "string" ? user.email : undefined,
          name: typeof user.username === "string" ? user.username : undefined,
          roles,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.roles = user.roles ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.roles = Array.isArray(token.roles)
          ? (token.roles as string[])
          : [];
      }
      return session;
    },
  },
});
