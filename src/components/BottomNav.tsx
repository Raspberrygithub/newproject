"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/review", label: "Review", icon: "🎯" },
  { href: "/voice", label: "Voice", icon: "🎙️" },
  { href: "/add", label: "Add", icon: "➕" },
  { href: "/browse", label: "Browse", icon: "📚" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-surface/95 backdrop-blur">
      <div
        className="mx-auto flex max-w-xl items-stretch justify-around"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {items.map((it) => {
          const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs transition ${
                active ? "text-accent" : "text-muted"
              }`}
            >
              <span className="text-xl leading-none">{it.icon}</span>
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
