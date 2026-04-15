"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getUserProfile, type UserProfile } from "@/app/actions/auth";

type UserProfileState = {
  profile: UserProfile | null;
  loading: boolean;
};

const UserProfileContext = createContext<UserProfileState>({
  profile: null,
  loading: true,
});

export function UserRoleProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UserProfileState>({
    profile: null,
    loading: true,
  });

  useEffect(() => {
    getUserProfile()
      .then((result) => {
        setState({
          profile: result.success ? result.data : null,
          loading: false,
        });
      })
      .catch(() => {
        setState({ profile: null, loading: false });
      });
  }, []);

  return (
    <UserProfileContext.Provider value={state}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile(): UserProfile | null {
  return useContext(UserProfileContext).profile;
}

export function useUserProfileLoading(): boolean {
  return useContext(UserProfileContext).loading;
}

export function useIsAdmin(): boolean {
  return useContext(UserProfileContext).profile?.role === "admin";
}
