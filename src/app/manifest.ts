import type { MetadataRoute } from "next";

// Makes the public site installable ("Add to Home screen") and is the base for the Android APK.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Al Mashriq Trading",
    short_name: "Al Mashriq",
    description: "Japanese used cars, parts and machinery for export: live stock, offers, and your invoices and payments.",
    start_url: "/?source=app",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0c",
    theme_color: "#0a0a0c",
    categories: ["shopping", "business"],
    icons: [
      { src: "/app-icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Stock", url: "/cars?source=app" },
      { name: "Offers", url: "/offers?source=app" },
      { name: "My account", url: "/account?source=app" },
    ],
  };
}
