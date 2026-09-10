import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP_NAME } from "@/constants/app";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { DbBootProvider } from "@/db/DbBootProvider";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "From \"I think I want fish\" to a thriving planted tank.",
  manifest: "/manifest.json",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

// No maximumScale/userScalable:false — disabling pinch-zoom is an
// accessibility regression per docs/04-design-system.md and T-010's spec.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#12181a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <LocaleProvider>
            <DbBootProvider>{children}</DbBootProvider>
          </LocaleProvider>
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
