import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fromError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/api-auth";
import { idSchema, locationSchema } from "@/lib/validators";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ locationId: string }> },
) {
  try {
    const { locationId: locationIdParam } = await context.params;
    const locationId = idSchema.parse(locationIdParam);
    const data = await prisma.inventoryLocation.findUnique({
      where: { id: locationId },
      include: { warehouse: true },
    });
    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ locationId: string }> },
) {
  try {
    await requirePermission("warehouse:manage");
    const { locationId: locationIdParam } = await context.params;
    const locationId = idSchema.parse(locationIdParam);
    const parsed = locationSchema.parse(await request.json());
    const data = await prisma.inventoryLocation.update({
      where: { id: locationId },
      data: parsed,
    });
    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ locationId: string }> },
) {
  try {
    await requirePermission("warehouse:manage");
    const { locationId: locationIdParam } = await context.params;
    const locationId = idSchema.parse(locationIdParam);
    const data = await prisma.inventoryLocation.delete({ where: { id: locationId } });
    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

