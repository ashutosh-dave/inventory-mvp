import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Boxes,
  ShieldCheck,
  Layers,
  Search,
  ClipboardCheck,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  PackageMinus,
} from "lucide-react";
import type { ReactNode } from "react";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return <LandingPage />;
  }

  return <Dashboard />;
}

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Boxes className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Inventory ERP
            </span>
          </div>
          <Button asChild size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/[0.04] to-background">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,oklch(0.55_0.2_260/0.08),transparent_60%)]" />
          <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Inventory ERP for warehouses
              </div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Move stock with confidence.
                <br />
                <span className="text-primary">Audit it forever.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-lg text-base text-muted-foreground sm:text-lg">
                Batch & expiry tracking, FIFO lot allocation, low-stock
                triggers, and role-based access. Every movement writes an
                immutable audit record.
              </p>
              <div className="mt-8 flex items-center justify-center gap-3">
                <Button asChild>
                  <Link href="/login">
                    Get started
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/login">Request access</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-b py-16">
          <div className="mx-auto max-w-5xl px-4">
            <div className="mx-auto mb-10 max-w-lg text-center">
              <h2 className="text-2xl font-semibold tracking-tight">
                Everything you need to manage inventory
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Built for warehouse teams that need accuracy and auditability.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FeatureCard
                icon={<ShieldCheck className="h-5 w-5" />}
                title="Role-Based Access"
                description="Departmental permissions keep operations safe and scoped."
              />
              <FeatureCard
                icon={<Layers className="h-5 w-5" />}
                title="Batch & Expiry"
                description="Track lots with FIFO/FEFO enforcement on every stock-out."
              />
              <FeatureCard
                icon={<ClipboardCheck className="h-5 w-5" />}
                title="Audit Trail"
                description="Immutable ledger entries for every stock movement."
              />
              <FeatureCard
                icon={<Search className="h-5 w-5" />}
                title="Fast Search"
                description="Filter by SKU, batch, warehouse, and virtual location."
              />
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section className="py-16">
          <div className="mx-auto max-w-5xl px-4">
            <div className="mx-auto mb-10 max-w-lg text-center">
              <h2 className="text-2xl font-semibold tracking-tight">
                How it works
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Three steps to full inventory control.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <StepCard
                step="1"
                title="Stock In"
                description="Receive purchases with batch numbers, expiry dates, and unit costs."
              />
              <StepCard
                step="2"
                title="Stock Out & Transfer"
                description="FIFO-allocated removals and warehouse-to-warehouse transfers."
              />
              <StepCard
                step="3"
                title="Audit & Resolve"
                description="Review low-stock alerts, run adjustments, and verify the immutable log."
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="mx-auto max-w-5xl px-4 text-center text-xs text-muted-foreground">
          Built with Next.js, Prisma, and NextAuth.
        </div>
      </footer>
    </div>
  );
}

async function Dashboard() {
  const balances = await prisma.inventoryBalance.findMany({
    where: { quantityOnHand: { gt: 0 } },
    select: {
      quantityOnHand: true,
      batch: { select: { unitCost: true } },
    },
  });

  const totalValue = balances.reduce((sum, b) => {
    const unitCost =
      b.batch.unitCost?.toNumber?.() ?? Number(b.batch.unitCost);
    return sum + b.quantityOnHand * unitCost;
  }, 0);

  const openAlerts = await prisma.lowStockAlert.count({
    where: { status: "OPEN" },
  });

  const totalLots = balances.length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of inventory health and key metrics.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Inventory Valuation"
          value={`$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Total value of stock on hand"
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Low Stock Alerts"
          value={String(openAlerts)}
          subtitle="Open alerts needing attention"
          href="/low-stock"
        />
        <StatCard
          icon={<Layers className="h-4 w-4" />}
          label="Active Lots"
          value={String(totalLots)}
          subtitle="Batch lots with stock on hand"
        />
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Quick actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            icon={<PackageMinus className="h-4 w-4" />}
            title="Stock Out"
            description="Record a sale or usage"
            href="/stock-counting"
          />
          <QuickAction
            icon={<Search className="h-4 w-4" />}
            title="Search Inventory"
            description="Find stock by SKU or batch"
            href="/inventory-search"
          />
          <QuickAction
            icon={<AlertTriangle className="h-4 w-4" />}
            title="Low Stock Alerts"
            description="Review and resolve alerts"
            href="/low-stock"
          />
          <QuickAction
            icon={<ClipboardCheck className="h-4 w-4" />}
            title="Audit Logs"
            description="View immutable history"
            href="/inventory-search"
          />
        </div>
      </div>
    </div>
  );
}

/* ---- Shared sub-components ---- */

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      </CardContent>
    </Card>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="mb-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {step}
        </div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      </CardContent>
    </Card>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtitle,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  subtitle: string;
  href?: string;
}) {
  const content = (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
        <div className="mt-2 text-2xl font-semibold tracking-tight">
          {value}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function QuickAction({
  icon,
  title,
  description,
  href,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="group h-full transition-all hover:border-primary/30 hover:shadow-md">
        <CardContent className="flex items-start gap-3 p-4">
          <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            {icon}
          </div>
          <div>
            <div className="text-sm font-medium">{title}</div>
            <div className="text-xs text-muted-foreground">{description}</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
