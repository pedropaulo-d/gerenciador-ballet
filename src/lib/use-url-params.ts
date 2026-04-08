"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Hook for managing URL search params as state.
 * Provides a setParams function that updates the URL without navigation.
 *
 * @param basePath - The base path to use when all params are cleared (e.g. "/students")
 * @param sentinel - The sentinel value used for "all" / unselected (e.g. "__all__")
 */
export function useUrlParams(basePath: string, sentinel = "__all__") {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value || value === sentinel) params.delete(key);
        else params.set(key, value);
      }
      if (!("page" in updates)) params.delete("page");
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : basePath, { scroll: false });
    },
    [router, searchParams, basePath, sentinel]
  );

  return { searchParams, setParams } as const;
}
