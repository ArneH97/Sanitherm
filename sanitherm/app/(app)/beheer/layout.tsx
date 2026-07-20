import { redirect } from "next/navigation";
import { huidigeWerknemer } from "@/lib/werknemer";

// Schermt alle /beheer-routes af: enkel de zaakvoerder mag hier.
export default async function BeheerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ik = await huidigeWerknemer();
  if (!ik || ik.rol !== "zaakvoerder") redirect("/");
  return <>{children}</>;
}
