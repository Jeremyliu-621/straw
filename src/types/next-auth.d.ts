/**
 * NextAuth type extensions
 * Extends the default Session and User types
 */

import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      id?: string;
      role?: string;
    };
  }

  interface User {
    id?: string;
    role?: string;
  }
}
