import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fromError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/api-auth";
import { AlertStatus } from "../../../generated/prisma/enums";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("inventory:write");
    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status");

    const where = statusParam
      ? { status: statusParam as (typeof AlertStatus)[keyof typeof AlertStatus] }
      : undefined;

    const data = await prisma.lowStockAlert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        product: true,
        warehouse: true,
        location: true,
        acknowledgedBy: true,
      },
    });
    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

