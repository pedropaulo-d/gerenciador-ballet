"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPinIcon, UsersIcon, GraduationCapIcon, DollarSignIcon, UploadIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/locations", label: "Locais", icon: MapPinIcon },
  { href: "/students", label: "Alunas", icon: UsersIcon },
  { href: "/classes", label: "Turmas", icon: GraduationCapIcon },
  { href: "/finances", label: "Financeiro", icon: DollarSignIcon },
  { href: "/import", label: "Importar", icon: UploadIcon },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <Link href="/locations" className="font-heading text-lg font-semibold tracking-tight">
            Petit Allegro
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-4">
        {children}
      </main>

      <nav className="sticky bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-around">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="size-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
