"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/workflow", label: "Workflows" },
  { href: "/account", label: "Account" },
];

export function HeaderClient() {
  const pathname = usePathname();

  return (
    <div className="fixed top-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
      <header className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-white/[0.08] bg-background/75 px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl w-full max-w-2xl">
        {/* Brand */}
        <Link
          href="/workflow"
          className="mr-3 px-2 py-1 text-sm font-semibold tracking-tight text-foreground"
        >
          Sooket
        </Link>

        {/* Divider */}
        <div className="h-4 w-px bg-border mx-1" />

        {/* Nav links */}
        <nav className="flex items-center gap-1 flex-1">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm transition-colors",
                pathname.startsWith(href)
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
    </div>
  );
}
