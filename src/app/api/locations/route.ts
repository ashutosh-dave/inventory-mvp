import { prisma } from "@/lib/prisma";
import { fromError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/api-auth";
import { idSchema, locationSchema } from "@/lib/validators";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const warehouseIdParam = url.searchParams.get("warehouseId");
    const where = warehouseIdParam
      ? { warehouseId: idSchema.parse(warehouseIdParam) }
      : undefined;

    const data = await prisma.inventoryLocation.findMany({
      where,
      orderBy: [{ warehouseId: "asc" }, { code: "asc" }],
      include: { warehouse: true },
    });
    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission("warehouse:manage");
    const parsed = locationSchema.parse(await request.json());
    const data = await prisma.inventoryLocation.create({ data: parsed });
    return ok(data, 201);
  } catch (error) {
    return fromError(error);
  }
}

