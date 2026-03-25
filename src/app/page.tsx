import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="mx-auto w-full max-w-2xl p-6">
        <h1 className="mb-2 text-2xl font-semibold">Inventory ERP</h1>
        <p className="mb-4 text-muted-foreground">
          Please sign in to view inventory valuation and stock operations.
        </p>
        <Link href="/login" className="rounded bg-black px-4 py-2 text-white">
          Sign in
        </Link>
      </main>
    );
  }

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

  return (
    <main className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">
              Inventory Valuation
            </div>
            <div className="mt-2 text-3xl font-semibold">
              {totalValue.toFixed(2)}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              Total value of stock on hand (by batch unit cost).
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">
              Low Stock Alerts
            </div>
            <div className="mt-2 text-3xl font-semibold">{openAlerts}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Open alerts needing attention.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button asChild className="flex-1">
          <Link href="/stock-counting">Stock Out (Mobile)</Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href="/inventory-search">Inventory Search</Link>
        </Button>
      </div>
    </main>
  );
}
