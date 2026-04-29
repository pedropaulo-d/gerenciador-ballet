"use client";

import { useRouter } from "next/navigation";
import { useUserProfile } from "@/lib/user-role-context";
import { signOut } from "@/app/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOutIcon } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administradora",
  teacher: "Professora",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function UserNav() {
  const router = useRouter();
  const profile = useUserProfile();

  if (!profile) {
    return (
      <div className="size-8 animate-pulse rounded-full border border-primary/20 bg-muted" />
    );
  }

  const initials = getInitials(profile.fullName) || "?";
  const roleLabel = ROLE_LABEL[profile.role] ?? profile.role;

  async function handleSignOut() {
    const result = await signOut();
    if (result.success) router.push("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar className="size-8 border border-primary/30">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium leading-tight">{profile.fullName}</p>
          <p className="text-xs text-muted-foreground">{roleLabel}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOutIcon className="mr-2 size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
