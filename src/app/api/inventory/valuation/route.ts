import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fromError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("inventory:write");

    const url = new URL(request.url);
    const warehouseId = url.searchParams.get("warehouseId");
    const locationId = url.searchParams.get("locationId");

    const where: {
      quantityOnHand: { gt: number };
      warehouseId?: string;
      locationId?: string;
    } = {
      quantityOnHand: { gt: 0 },
    };
    if (warehouseId) where.warehouseId = warehouseId;
    if (locationId) where.locationId = locationId;

    const balances = await prisma.inventoryBalance.findMany({
      where,
      select: {
        quantityOnHand: true,
        batch: { select: { unitCost: true } },
      },
    });

    const totalValue = balances.reduce((sum, b) => {
      const unitCost = b.batch.unitCost?.toNumber?.() ?? Number(b.batch.unitCost);
      return sum + b.quantityOnHand * unitCost;
    }, 0);

    return ok({ totalValue });
  } catch (error) {
    return fromError(error);
  }
}

