import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fromError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/api-auth";
import { idSchema, warehouseSchema } from "@/lib/validators";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ warehouseId: string }> },
) {
  try {
    const { warehouseId: warehouseIdParam } = await context.params;
    const warehouseId = idSchema.parse(warehouseIdParam);
    const data = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      include: { locations: true },
    });
    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ warehouseId: string }> },
) {
  try {
    await requirePermission("warehouse:manage");
    const { warehouseId: warehouseIdParam } = await context.params;
    const warehouseId = idSchema.parse(warehouseIdParam);
    const parsed = warehouseSchema.parse(await request.json());
    const data = await prisma.warehouse.update({
      where: { id: warehouseId },
      data: parsed,
    });
    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ warehouseId: string }> },
) {
  try {
    await requirePermission("warehouse:manage");
    const { warehouseId: warehouseIdParam } = await context.params;
    const warehouseId = idSchema.parse(warehouseIdParam);
    const data = await prisma.warehouse.delete({ where: { id: warehouseId } });
    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

