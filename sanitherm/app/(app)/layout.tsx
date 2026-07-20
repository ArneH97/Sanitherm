import { redirect } from "next/navigation";
import { huidigeWerknemer } from "@/lib/werknemer";
import AppNavigatie, { type NavLink } from "@/components/AppNavigatie";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const werknemer = await huidigeWerknemer();
  if (!werknemer) redirect("/login");
  // Eerste aanmelding: eerst een eigen wachtwoord instellen.
  if (!werknemer.wachtwoord_ingesteld) redirect("/wachtwoord");

  const isBaas = werknemer.rol === "zaakvoerder";

  const links: NavLink[] = isBaas
    ? [
        { href: "/beheer", label: "Overzicht", kort: "Overzicht", icon: "overzicht" },
        {
          href: "/beheer/goedkeuringen",
          label: "Goedkeuringen",
          kort: "Keuren",
          icon: "goedkeuringen",
        },
        {
          href: "/beheer/werknemers",
          label: "Werknemers",
          kort: "Ploeg",
          icon: "werknemers",
        },
        {
          href: "/beheer/export",
          label: "Export",
          kort: "Export",
          icon: "export",
        },
      ]
    : [
        { href: "/vandaag", label: "Vandaag", kort: "Vandaag", icon: "vandaag" },
        { href: "/week", label: "Mijn week", kort: "Week", icon: "week" },
        { href: "/verlof", label: "Verlof", kort: "Verlof", icon: "verlof" },
        { href: "/ziek", label: "Ziek melden", kort: "Ziek", icon: "ziek" },
      ];

  return (
    <div className="min-h-screen">
      <AppNavigatie links={links} naam={werknemer.naam} />
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-6 sm:pb-12">
        {children}
      </main>
    </div>
  );
}
