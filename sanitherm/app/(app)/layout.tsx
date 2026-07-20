import Link from "next/link";
import { redirect } from "next/navigation";
import { huidigeWerknemer } from "@/lib/werknemer";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const werknemer = await huidigeWerknemer();
  if (!werknemer) redirect("/login");

  const isBaas = werknemer.rol === "zaakvoerder";

  const links = isBaas
    ? [
        { href: "/beheer", label: "Overzicht" },
        { href: "/beheer/goedkeuringen", label: "Goedkeuringen" },
        { href: "/beheer/werknemers", label: "Werknemers" },
      ]
    : [
        { href: "/vandaag", label: "Vandaag" },
        { href: "/week", label: "Mijn week" },
        { href: "/verlof", label: "Verlof" },
        { href: "/ziek", label: "Ziek melden" },
      ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <span className="font-bold text-merk">Sanitherm</span>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {werknemer.naam}
            </span>
            <form action="/auth/signout" method="post">
              <button className="text-sm text-slate-500 hover:text-slate-900">
                Afmelden
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex-1 py-3 text-center text-xs font-medium text-slate-600 hover:bg-merk-licht hover:text-merk"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
