import type { Prisma } from "../generated/prisma/client";
import type { PrismaClient } from "../generated/prisma/client";

export type WriteAuditLogInput = {
  entityType: string;
  entityId: string;
  action: string;
  performedById: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
};

export async function writeAuditLog(
  tx: Prisma.TransactionClient | PrismaClient,
  input: WriteAuditLogInput,
) {
  await tx.auditLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      beforeValue: input.beforeValue as Prisma.InputJsonValue,
      afterValue: input.afterValue as Prisma.InputJsonValue,
      performedById: input.performedById,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });
}

