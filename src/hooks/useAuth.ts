/**
 * Hook for accessing authentication info on the client side
 */

"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export function useAuth() {
  const { data: session, status } = useSession();

  const user = session?.user as
    | {
        id?: string;
        email?: string;
        name?: string;
        image?: string;
        role?: string;
      }
    | undefined;

  return {
    user,
    session,
    status,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    signIn: (provider?: string) => signIn(provider),
    signOut: () => signOut(),
  };
}
