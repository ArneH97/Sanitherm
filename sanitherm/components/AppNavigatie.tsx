"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type IconNaam =
  | "vandaag"
  | "week"
  | "verlof"
  | "ziek"
  | "overzicht"
  | "goedkeuringen"
  | "werknemers";

export interface NavLink {
  href: string;
  label: string; // volledige naam (desktop)
  kort: string; // korte naam onder het icoon (mobiel)
  icon: IconNaam;
}

export default function AppNavigatie({
  links,
  naam,
}: {
  links: NavLink[];
  naam: string;
}) {
  const pad = usePathname();

  const isActief = (href: string) =>
    href === "/beheer"
      ? pad === "/beheer"
      : pad === href || pad.startsWith(href + "/");

  return (
    <>
      {/* Bovenbalk — merknaam, op desktop ook de navigatie */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold text-merk">Sanitherm</span>

            {/* Navigatie in de balk — enkel op desktop/tablet */}
            <nav className="hidden items-center gap-1 sm:flex">
              {links.map((l) => {
                const actief = isActief(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={actief ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      actief
                        ? "bg-merk-licht text-merk"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon naam={l.icon} className="h-4 w-4" />
                    {l.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden max-w-[8rem] truncate text-sm text-slate-500 sm:inline">
              {naam}
            </span>
            <form action="/auth/signout" method="post">
              <button className="rounded-lg px-2 py-1 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
                Afmelden
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Onderbalk — mobiele tabbladen met iconen; verborgen op desktop */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Hoofdnavigatie"
      >
        <div className="mx-auto flex max-w-3xl">
          {links.map((l) => {
            const actief = isActief(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={actief ? "page" : undefined}
                className={`flex flex-1 flex-col items-center gap-1 pb-1.5 pt-2 text-[11px] font-medium transition ${
                  actief ? "text-merk" : "text-slate-500 active:text-merk"
                }`}
              >
                <span
                  className={`flex h-8 w-16 items-center justify-center rounded-full transition ${
                    actief ? "bg-merk-licht" : ""
                  }`}
                >
                  <Icon naam={l.icon} className="h-[22px] w-[22px]" />
                </span>
                {l.kort}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

// Eenvoudige lijn-iconen (stroke = currentColor, dus ze volgen de tekstkleur).
function Icon({ naam, className }: { naam: IconNaam; className?: string }) {
  const paden: Record<IconNaam, React.ReactNode> = {
    vandaag: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v4.8l3 1.8" />
      </>
    ),
    week: (
      <>
        <rect x="3" y="4.5" width="18" height="16.5" rx="2" />
        <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
      </>
    ),
    verlof: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
      </>
    ),
    ziek: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" />
      </>
    ),
    overzicht: (
      <>
        <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
        <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
        <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
        <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
      </>
    ),
    goedkeuringen: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.2 12.2 2.6 2.6 5-5.6" />
      </>
    ),
    werknemers: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <path d="M16.5 5.6a3.2 3.2 0 0 1 0 5.6M21 20c0-2.6-1.4-4.8-3.5-5.7" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paden[naam]}
    </svg>
  );
}
