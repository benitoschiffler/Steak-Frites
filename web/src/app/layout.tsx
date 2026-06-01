import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { loadMeta } from "@/lib/data";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Steak Frites — League History",
  description: "All-time history, records, and keeper tracker for the Steak Frites fantasy league.",
};

const NAV = [
  { href: "/", label: "Home" },
  { href: "/champions", label: "Trophies" },
  { href: "/playoffs", label: "Playoffs" },
  { href: "/what-if", label: "What If" },
  { href: "/records", label: "Records" },
  { href: "/players", label: "Players" },
  { href: "/seasons", label: "Seasons" },
  { href: "/teams", label: "Owners" },
  { href: "/keepers", label: "Keepers" },
];

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "—";
  const diffMs = Date.now() - then;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 8) return `${weeks}w ago`;
  const months = Math.round(days / 30);
  if (months < 18) return `${months}mo ago`;
  return new Date(iso).toLocaleDateString();
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const meta = loadMeta();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-[#17140f]">
        <header className="sticky top-0 z-20 border-b border-black/10 bg-[#fffaf0]/92 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:gap-6">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#123d35] text-sm font-black text-[#f7d77d] shadow-sm">
                SF
              </span>
              <span>
                <span className="block text-lg font-black tracking-tight">Steak Frites</span>
                <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[#8a6a22]">
                  League Archive
                </span>
              </span>
            </Link>
            <nav className="flex flex-wrap gap-2 text-sm md:gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-full px-3 py-1.5 font-semibold text-[#5c5549] transition hover:bg-[#123d35]/10 hover:text-[#123d35]"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <span className="badge badge-green md:ml-auto" title={new Date(meta.updated_at).toLocaleString()}>
              {meta.years[0]}–{meta.current_year} · Updated {relativeTime(meta.updated_at)}
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:py-10">{children}</main>
        <footer className="border-t border-black/10 bg-[#123d35] text-xs text-[#f7edda]/75">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#f7d77d]/15 text-[10px] font-black text-[#f7d77d]">SF</span>
              Steak Frites League Archive · est. {meta.years[0]}
            </span>
            <span>{meta.current_year - meta.years[0] + 1} seasons of standings, trophies, keepers, and scores.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
