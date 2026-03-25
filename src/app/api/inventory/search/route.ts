import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fromError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("inventory:write");

    const url = new URL(request.url);
    const sku = url.searchParams.get("sku") ?? undefined;
    const batchNumber = url.searchParams.get("batchNumber") ?? undefined;
    const warehouseId = url.searchParams.get("warehouseId") ?? undefined;
    const locationId = url.searchParams.get("locationId") ?? undefined;

    const balances = await prisma.inventoryBalance.findMany({
      where: {
        quantityOnHand: { gt: 0 },
        ...(warehouseId ? { warehouseId } : {}),
        ...(locationId ? { locationId } : {}),
        ...(sku ? { product: { sku } } : {}),
        ...(batchNumber ? { batch: { batchNumber } } : {}),
      },
      select: {
        quantityOnHand: true,
        warehouse: { select: { code: true, name: true } },
        location: { select: { code: true, name: true, type: true } },
        product: { select: { id: true, sku: true, name: true } },
        batch: {
          select: {
            id: true,
            batchNumber: true,
            expiryDate: true,
            receivedAt: true,
            unitCost: true,
          },
        },
      },
    });

    const sorted = balances.sort((a, b) => {
      const aExpiry = a.batch.expiryDate?.getTime() ?? Infinity;
      const bExpiry = b.batch.expiryDate?.getTime() ?? Infinity;
      if (aExpiry !== bExpiry) return aExpiry - bExpiry;
      return a.batch.receivedAt.getTime() - b.batch.receivedAt.getTime();
    });

    return ok(
      sorted.map((b) => ({
        product: b.product,
        batch: b.batch,
        warehouse: b.warehouse,
        location: b.location,
        quantityOnHand: b.quantityOnHand,
      })),
    );
  } catch (error) {
    return fromError(error);
  }
}

