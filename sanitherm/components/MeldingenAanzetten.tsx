"use client";

import { useEffect, useState } from "react";
import { pushInschrijven, pushUitschrijven } from "@/app/(app)/push-actions";

type Status = "laden" | "uit" | "aan" | "geweigerd" | "niet-ondersteund";

// Zet een base64url VAPID-sleutel om naar het formaat dat de browser verwacht.
function sleutelNaarBytes(base64: string): Uint8Array {
  const opvulling = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + opvulling).replace(/-/g, "+").replace(/_/g, "/");
  const ruw = atob(b64);
  const bytes = new Uint8Array(ruw.length);
  for (let i = 0; i < ruw.length; i++) bytes[i] = ruw.charCodeAt(i);
  return bytes;
}

export default function MeldingenAanzetten() {
  const [status, setStatus] = useState<Status>("laden");
  const [bezig, setBezig] = useState(false);

  const publiekeSleutel = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window) ||
      !publiekeSleutel
    ) {
      setStatus("niet-ondersteund");
      return;
    }
    navigator.serviceWorker
      .register("/sw.js")
      .then(async (reg) => {
        const bestaand = await reg.pushManager.getSubscription();
        if (bestaand) setStatus("aan");
        else if (Notification.permission === "denied") setStatus("geweigerd");
        else setStatus("uit");
      })
      .catch(() => setStatus("niet-ondersteund"));
  }, [publiekeSleutel]);

  async function aanzetten() {
    if (!publiekeSleutel) return;
    setBezig(true);
    try {
      const toestemming = await Notification.requestPermission();
      if (toestemming !== "granted") {
        setStatus(toestemming === "denied" ? "geweigerd" : "uit");
        setBezig(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: sleutelNaarBytes(publiekeSleutel),
      });
      const json = sub.toJSON();
      const res = await pushInschrijven({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      setStatus(res?.ok ? "aan" : "uit");
    } catch {
      setStatus("uit");
    }
    setBezig(false);
  }

  async function uitzetten() {
    setBezig(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await pushUitschrijven(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("uit");
    } catch {
      // negeren
    }
    setBezig(false);
  }

  if (status === "laden") return null;

  if (status === "niet-ondersteund") {
    return (
      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500 ring-1 ring-slate-200">
        📱 Zet de app op je beginscherm om herinneringen te ontvangen (zie de
        handleiding).
      </div>
    );
  }

  if (status === "aan") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm ring-1 ring-emerald-200">
        <span className="font-medium text-emerald-700">
          🔔 Herinneringen staan aan
        </span>
        <button
          onClick={uitzetten}
          disabled={bezig}
          className="text-xs text-slate-500 hover:text-slate-800"
        >
          uitzetten
        </button>
      </div>
    );
  }

  if (status === "geweigerd") {
    return (
      <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-200">
        Meldingen zijn geblokkeerd. Zet ze aan in de instellingen van je telefoon
        of browser om een herinnering te krijgen.
      </div>
    );
  }

  // status === "uit"
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-merk-licht px-4 py-3 ring-1 ring-merk/20">
      <span className="text-sm text-slate-700">
        🔔 Wil je zondag een herinnering om je week te bevestigen?
      </span>
      <button
        onClick={aanzetten}
        disabled={bezig}
        className="rounded-lg bg-merk px-3 py-1.5 text-sm font-medium text-white transition hover:bg-merk-donker disabled:opacity-60"
      >
        {bezig ? "Bezig…" : "Meldingen aanzetten"}
      </button>
    </div>
  );
}
