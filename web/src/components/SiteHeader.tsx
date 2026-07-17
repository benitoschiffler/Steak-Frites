"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = { href: string; label: string };

export function SiteHeader({
  nav,
  updatedLabel,
  updatedTitle,
}: {
  nav: NavItem[];
  updatedLabel: string;
  updatedTitle: string;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinkClass = (href: string) => {
    const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
    return `flex min-h-11 items-center whitespace-nowrap rounded-lg px-3 font-semibold transition lg:min-h-10 lg:px-2 lg:text-xs xl:text-sm ${
      active
        ? "bg-[#123d35] text-[#fffaf0]"
        : "text-[#5c5549] hover:bg-[#123d35]/10 hover:text-[#123d35]"
    }`;
  };

  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-[#fffaf0]/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-3" onClick={() => setMenuOpen(false)}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#123d35] text-sm font-black text-[#f7d77d] shadow-sm">
              SF
            </span>
            <span className="min-w-0">
              <span className="block truncate text-lg font-black tracking-tight">Steak Frites</span>
              <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[#8a6a22]">
                League Archive
              </span>
            </span>
          </Link>

          <button
            type="button"
            className="flex min-h-11 items-center gap-2 rounded-lg border border-black/10 bg-[#fffdf7] px-3 text-sm font-bold text-[#3b3328] lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-site-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden className="grid w-4 gap-1">
              <span className="h-0.5 rounded-full bg-current" />
              <span className="h-0.5 rounded-full bg-current" />
              <span className="h-0.5 rounded-full bg-current" />
            </span>
            {menuOpen ? "Close" : "Menu"}
          </button>

          <nav className="hidden min-w-0 flex-1 flex-wrap items-center gap-1 lg:flex" aria-label="Primary navigation">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={navLinkClass(item.href)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden shrink-0 xl:block">
            <span className="badge badge-green" title={updatedTitle}>
              {updatedLabel}
            </span>
          </div>
        </div>

        <div id="mobile-site-nav" className={menuOpen ? "mt-3 lg:hidden" : "hidden"}>
          <nav className="grid grid-cols-2 gap-1 border-t border-black/10 pt-3 text-sm" aria-label="Mobile navigation">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={navLinkClass(item.href)}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <span className="badge badge-green mt-3 w-full justify-center" title={updatedTitle}>
            {updatedLabel}
          </span>
        </div>
      </div>
    </header>
  );
}
