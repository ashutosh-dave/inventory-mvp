import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fromError, ok } from "@/lib/api-response";
import { requirePermission, requireUser } from "@/lib/api-auth";
import { hasPermission } from "@/lib/rbac";
import { idSchema, productSchema } from "@/lib/validators";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ productId: string }> },
) {
  try {
    const { productId: productIdParam } = await context.params;
    const productId = idSchema.parse(productIdParam);

    const user = await requireUser().catch(() => null);
    const canSeeCost = user ? hasPermission(user.role, "procurement:view") : false;

    const data = await prisma.product.findUnique({
      where: { id: productId },
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

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> },
) {
  try {
    await requirePermission("inventory:write");
    const { productId: productIdParam } = await context.params;
    const productId = idSchema.parse(productIdParam);
    const parsed = productSchema.parse(await request.json());

    const data = await prisma.product.update({
      where: { id: productId },
      data: parsed,
    });
    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ productId: string }> },
) {
  try {
    await requirePermission("inventory:write");
    const { productId: productIdParam } = await context.params;
    const productId = idSchema.parse(productIdParam);

    const data = await prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date() },
    });
    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

