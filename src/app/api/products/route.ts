import { prisma } from "@/lib/prisma";
import { fromError, ok } from "@/lib/api-response";
import { requirePermission, requireUser } from "@/lib/api-auth";
import { hasPermission } from "@/lib/rbac";
import { productSchema } from "@/lib/validators";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sku = url.searchParams.get("sku");

    const user = await requireUser().catch(() => null);
    const canSeeCost = user ? hasPermission(user.role, "procurement:view") : false;

    const data = await prisma.product.findMany({
      where: {
        deletedAt: null,
        ...(sku ? { sku } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        baseUnit: true,
        batches: {
          select: canSeeCost
            ? { id: true, batchNumber: true, expiryDate: true, unitCost: true }
            : { id: true, batchNumber: true, expiryDate: true },
          orderBy: { receivedAt: "asc" },
        },
      },
    });

    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission("inventory:write");
    const parsed = productSchema.parse(await request.json());
    const data = await prisma.product.create({ data: parsed });
    return ok(data, 201);
  } catch (error) {
    return fromError(error);
  }
}

