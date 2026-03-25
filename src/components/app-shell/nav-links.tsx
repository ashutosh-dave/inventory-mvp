"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowRightLeft,
  PackageMinus,
  AlertTriangle,
  Search,
  Package,
  Tags,
  Warehouse,
  Users,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

const sections = [
  {
    title: "Operations",
    links: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/movements", label: "Movements", icon: ArrowRightLeft },
      { href: "/stock-counting", label: "Quick Stock Out", icon: PackageMinus },
      { href: "/low-stock", label: "Low Stock", icon: AlertTriangle },
    ],
  },
  {
    title: "Master Data",
    links: [
      { href: "/products", label: "Products", icon: Package },
      { href: "/categories", label: "Categories", icon: Tags },
      { href: "/warehouses", label: "Warehouses", icon: Warehouse },
      { href: "/teams", label: "Teams", icon: Users },
    ],
  },
  {
    title: "Reports",
    links: [
      { href: "/inventory-search", label: "Search", icon: Search },
      { href: "/audit-log", label: "Audit Log", icon: ClipboardList },
    ],
  },
] as const;

const mobileLinks = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/movements", label: "Move", icon: ArrowRightLeft },
  { href: "/products", label: "Products", icon: Package },
  { href: "/inventory-search", label: "Search", icon: Search },
  { href: "/audit-log", label: "Audit", icon: ClipboardList },
] as const;

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-4 px-3">
      {sections.map((section) => (
        <div key={section.title}>
          <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
          </div>
          <div className="flex flex-col gap-0.5">
            {section.links.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-around">
      {mobileLinks.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-2 text-[10px] font-medium transition-colors",
              active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
