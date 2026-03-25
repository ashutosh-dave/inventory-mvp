import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fromError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/api-auth";
import { idSchema } from "@/lib/validators";
import { AlertStatus } from "@/generated/prisma/enums";
import { writeAuditLog } from "@/lib/audit";

const actionSchema = (value: unknown) => {
  if (value === "ACKNOWLEDGE") return "ACKNOWLEDGE" as const;
  if (value === "RESOLVE") return "RESOLVE" as const;
  throw new Error("Invalid action");
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ alertId: string }> },
) {
  try {
    await requirePermission("inventory:write");
    const { alertId } = await context.params;
    const parsedId = idSchema.parse(alertId);
    const data = await prisma.lowStockAlert.findUnique({
      where: { id: parsedId },
      include: { product: true, warehouse: true, location: true, acknowledgedBy: true },
    });
    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ alertId: string }> },
) {
  try {
    const user = await requirePermission("inventory:write");
    const { alertId } = await context.params;
    const parsedId = idSchema.parse(alertId);

    const body = await request.json();
    const action = actionSchema(body?.action);

    const now = new Date();

    if (action === "ACKNOWLEDGE") {
      const updated = await prisma.lowStockAlert.update({
        where: { id: parsedId },
        data: {
          status: AlertStatus.ACKNOWLEDGED,
          acknowledgedById: user.id,
          acknowledgedAt: now,
        },
      });

      await writeAuditLog(prisma, {
        entityType: "LowStockAlert",
        entityId: updated.id,
        action: "ACKNOWLEDGED",
        performedById: user.id,
        afterValue: updated,
      });

      return ok(updated);
    }

    const updated = await prisma.lowStockAlert.update({
      where: { id: parsedId },
      data: {
        status: AlertStatus.RESOLVED,
        resolvedAt: now,
      },
    });

    await writeAuditLog(prisma, {
      entityType: "LowStockAlert",
      entityId: updated.id,
      action: "RESOLVED",
      performedById: user.id,
      afterValue: updated,
    });

    return ok(updated);
  } catch (error) {
    return fromError(error);
  }
}

