import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { DesktopNav, MobileNav } from "@/components/app-shell/nav-links";
import { Boxes } from "lucide-react";
import type { Session } from "next-auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Inventory ERP",
    template: "%s | Inventory ERP",
  },
  description:
    "Secure inventory management with batch/expiry tracking, FIFO allocation, low-stock alerts, and immutable audit logs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionPromise = auth() as unknown as Promise<Session | null>;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        <AppShell sessionPromise={sessionPromise}>{children}</AppShell>
      </body>
    </html>
  );
}

async function AppShell({
  children,
  sessionPromise,
}: {
  children: React.ReactNode;
  sessionPromise: Promise<Session | null>;
}) {
  const session = await sessionPromise;

  if (!session?.user) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 border-r bg-card md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2.5 border-b px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Boxes className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">
            Inventory ERP
          </span>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <DesktopNav />
        </div>

        <div className="border-t p-3">
          <div className="mb-2 truncate px-3 text-xs text-muted-foreground">
            {session.user.email ?? session.user.name ?? "User"}
          </div>
          <div className="px-1">
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Boxes className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold">Inventory ERP</span>
          </div>
          <SignOutButton />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>

        {/* Mobile bottom nav */}
        <div className="border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
          <MobileNav />
        </div>
      </div>
    </div>
  );
}
