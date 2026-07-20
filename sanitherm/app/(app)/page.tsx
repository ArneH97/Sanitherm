import { redirect } from "next/navigation";
import { huidigeWerknemer } from "@/lib/werknemer";

// Startpagina: stuurt door naar het juiste beginscherm op basis van de rol.
export default async function Home() {
  const werknemer = await huidigeWerknemer();
  if (!werknemer) redirect("/login");
  redirect(werknemer.rol === "zaakvoerder" ? "/beheer" : "/vandaag");
}
