import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    roles?: string[];
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      roles: string[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roles?: string[];
  }
}
