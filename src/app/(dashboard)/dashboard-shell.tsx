"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  ClipboardListIcon,
  UsersIcon,
  DollarSignIcon,
  EllipsisIcon,
  GraduationCapIcon,
  MapPinIcon,
  UploadIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { useIsAdmin } from "@/lib/user-role-context";
import { UserNav } from "@/components/user-nav";

const allNavItems = [
  { href: "/", label: "Inicio", icon: HomeIcon, exact: true },
  { href: "/attendance", label: "Chamada", icon: ClipboardListIcon },
  { href: "/students", label: "Alunas", icon: UsersIcon },
  { href: "/finances", label: "Financeiro", icon: DollarSignIcon, adminOnly: true },
];

const allMoreItems = [
  { href: "/classes", label: "Turmas", icon: GraduationCapIcon, adminOnly: true },
  { href: "/locations", label: "Locais", icon: MapPinIcon, adminOnly: true },
  { href: "/import", label: "Importar Alunas", icon: UploadIcon },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();
  const [moreOpen, setMoreOpen] = useState(false);

  const navItems = allNavItems.filter((item) => !item.adminOnly || isAdmin);
  const moreItems = allMoreItems.filter((item) => !item.adminOnly || isAdmin);

  const isMoreActive = moreItems.some((item) => pathname.startsWith(item.href));

  return (
    <div className="flex min-h-dvh flex-col pb-16">
      {/* ─── Header with gold accent line ─── */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Link href="/" className="group flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground text-shadow-gold">
              Petit Allegro
            </span>
          </Link>
          <UserNav />
        </div>
        {/* Gold accent line — teatro balcony rail */}
        <div className="h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 py-6">
        {children}
      </main>

      {/* ─── Bottom navigation ─── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
        <div className="mx-auto flex h-15 max-w-3xl items-center justify-around">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors",
                  isActive
                    ? "text-gold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="size-5" />
                <span className={cn(isActive && "font-semibold")}>{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors",
              isMoreActive
                ? "text-gold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <EllipsisIcon className="size-5" />
            <span className={cn(isMoreActive && "font-semibold")}>Mais</span>
          </button>
        </div>
      </nav>

      {/* ─── Sheet "Mais" ─── */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" showCloseButton={false}>
          <SheetHeader>
            <SheetTitle className="text-shadow-gold">Menu</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-1 px-4 pb-4">
            {moreItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <SheetClose key={item.href} asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors",
                      isActive
                        ? "bg-gold-light/30 text-gold font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="size-5" />
                    <span>{item.label}</span>
                  </Link>
                </SheetClose>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
