import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP_NAME } from "@/constants/app";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { UnitsProvider } from "@/lib/UnitsProvider";
import { DbBootProvider } from "@/db/DbBootProvider";
import { AuthSessionProvider } from "./AuthSessionProvider";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";
import { InstallPromptListener } from "./InstallPromptListener";
import { PageViewTracker } from "./PageViewTracker";
import { KeyboardAware } from "./KeyboardAware";
import { UpdateBanner } from "@/components/UpdateBanner";
import { InstalledBanner } from "@/components/InstalledBanner";
import { ViewAsBanner } from "@/components/ViewAsBanner";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "From \"I think I want fish\" to a thriving planted tank.",
  manifest: "/manifest.json",
  // apple-touch-icon needs a real raster image — iOS doesn't reliably
  // rasterize SVG for the home-screen icon the way Chrome/Android does.
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
};

// No maximumScale/userScalable:false — disabling pinch-zoom is an
// accessibility regression per docs/04-design-system.md and T-010's spec.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Android Chrome resizes the page when the keyboard opens, so bottom-pinned
  // inputs move above it (iOS handled by <KeyboardAware>).
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1112" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <AuthSessionProvider>
          <ThemeProvider>
            <UnitsProvider>
              <LocaleProvider>
                <DbBootProvider>{children}</DbBootProvider>
              </LocaleProvider>
            </UnitsProvider>
          </ThemeProvider>
        </AuthSessionProvider>
        <ServiceWorkerRegister />
        <InstallPromptListener />
        <PageViewTracker />
        <KeyboardAware />
        <UpdateBanner />
        <InstalledBanner />
        <ViewAsBanner />
      </body>
    </html>
  );
}
