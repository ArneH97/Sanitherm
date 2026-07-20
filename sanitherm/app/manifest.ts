import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sanitherm — Personeelsportaal",
    short_name: "Sanitherm",
    description: "Tijdsregistratie, verlof en ziektemelding voor Sanitherm",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f5aa8",
    lang: "nl",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
