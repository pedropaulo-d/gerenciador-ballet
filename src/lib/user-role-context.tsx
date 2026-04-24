"use client";

import { createContext, useContext } from "react";

export type UserProfile = {
  fullName: string;
  role: "admin" | "teacher";
};

const UserProfileContext = createContext<UserProfile | null>(null);

/**
 * Provider alimentado pelo Server Component (dashboard layout).
 * Não faz fetch — apenas distribui o profile já carregado no servidor.
 */
export function UserRoleProvider({
  profile,
  children,
}: {
  profile: UserProfile;
  children: React.ReactNode;
}) {
  return (
    <UserProfileContext.Provider value={profile}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile(): UserProfile | null {
  return useContext(UserProfileContext);
}

/**
 * Mantido por compatibilidade de assinatura. Como o profile é pré-carregado
 * no servidor, nunca está "loading" no cliente.
 */
export function useUserProfileLoading(): boolean {
  return false;
}

export function useIsAdmin(): boolean {
  return useContext(UserProfileContext)?.role === "admin";
}
