import { prisma as globalPrisma } from "@/lib/prisma";
import { convertQuantityToBaseUnit } from "@/lib/inventory/conversion";
import { writeAuditLog } from "@/lib/audit";
import {
  AdjustmentReason,
  AlertStatus,
  MovementSourceType,
  MovementType,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

class InventoryConcurrencyError extends Error {
  constructor(message = "CONCURRENT_STOCK_UPDATE") {
    super(message);
    this.name = "InventoryConcurrencyError";
  }
}

type StockInInput = {
  idempotencyKey: string;
  performedById: string;
  movementType: "STOCK_IN";
  sourceType: MovementSourceType | string;
  productId: string;
  warehouseId: string;
  locationId: string;
  batchNumber: string;
  expiryDate?: string | null;
  unitId: string;
  quantity: number; // in unitId
  unitCost: number; // cost per base unit
  reasonCode?: AdjustmentReason | string;
  reasonNote?: string | null;
};

type StockOutInput = {
  idempotencyKey: string;
  performedById: string;
  movementType: "STOCK_OUT";
  sourceType: MovementSourceType | string;
  productId: string;
  warehouseId: string;
  locationId: string;
  unitId: string;
  quantity: number; // in unitId
  reasonCode?: AdjustmentReason | string;
  reasonNote?: string | null;
};

type TransferInput = {
  idempotencyKey: string;
  performedById: string;
  movementType: "TRANSFER";
  sourceType: MovementSourceType | string;
  productId: string;
  fromWarehouseId: string;
  fromLocationId: string;
  toWarehouseId: string;
  toLocationId: string;
  unitId: string;
  quantity: number; // in unitId
  reasonCode?: AdjustmentReason | string;
  reasonNote?: string | null;
};

type AdjustmentInput = {
  idempotencyKey: string;
  performedById: string;
  movementType: "ADJUSTMENT";
  sourceType: MovementSourceType | string;
  productId: string;
  warehouseId: string;
  locationId: string;
  batchNumber: string;
  expiryDate?: string | null;
  unitId: string;
  quantity: number; // in unitId: target on-hand
  unitCost?: number; // required if batch doesn't exist
  reasonCode?: AdjustmentReason | string;
  reasonNote?: string | null;
};

export type MovementInput =
  | StockInInput
  | StockOutInput
  | TransferInput
  | AdjustmentInput;

function asDate(d?: string | null): Date | undefined {
  if (!d) return undefined;
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? undefined : dt;
}

function toAuditJsonUnitCost(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (typeof v === "object" && "toString" in v) {
    return (v as { toString: () => string }).toString();
  }
  return v;
}

function ledgerEntriesToAuditJson(
  entries: Array<{ unitCostSnapshot: unknown }>,
) {
  return entries.map((e) => ({
    ...e,
    unitCostSnapshot: toAuditJsonUnitCost(e.unitCostSnapshot),
  }));
}

async function evaluateLowStockScope(
  tx: Prisma.TransactionClient,
  args: {
  productId: string;
  warehouseId: string;
  locationId: string;
  },
) {
  const product = await tx.product.findUnique({
    where: { id: args.productId },
    select: { reorderPoint: true },
  });
  if (!product) return;
  if (!product.reorderPoint || product.reorderPoint <= 0) return;

  const total = await tx.inventoryBalance.aggregate({
    where: {
      productId: args.productId,
      warehouseId: args.warehouseId,
      locationId: args.locationId,
    },
    _sum: { quantityOnHand: true },
  });
  const qty = total._sum.quantityOnHand ?? 0;

  const scopeOpen = await tx.lowStockAlert.findFirst({
    where: {
      productId: args.productId,
      warehouseId: args.warehouseId,
      locationId: args.locationId,
      status: { in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED] },
    },
  });

  if (qty < product.reorderPoint) {
    if (!scopeOpen) {
      await tx.lowStockAlert.create({
        data: {
          productId: args.productId,
          warehouseId: args.warehouseId,
          locationId: args.locationId,
          triggerQty: product.reorderPoint,
          reorderPoint: product.reorderPoint,
          status: AlertStatus.OPEN,
        },
      });
    }
    return;
  }

  if (scopeOpen) {
    await tx.lowStockAlert.updateMany({
      where: {
        productId: args.productId,
        warehouseId: args.warehouseId,
        locationId: args.locationId,
        status: { in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED] },
      },
      data: {
        status: AlertStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    });
  }
}

export async function performMovement(input: MovementInput) {
  const prisma = globalPrisma;
  const retryMax = 3;
  let lastError: unknown;

  for (let attempt = 0; attempt < retryMax; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.stockTransaction.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          include: { entries: true },
        });
        if (existing) return existing;

        if (input.movementType === "STOCK_IN") {
          return await stockIn(tx, input);
        }
        if (input.movementType === "STOCK_OUT") {
          return await stockOut(tx, input);
        }
        if (input.movementType === "TRANSFER") {
          return await transfer(tx, input);
        }
        return await adjustment(tx, input);
      });
    } catch (e) {
      lastError = e;
      if (e instanceof InventoryConcurrencyError) {
        // retry
        continue;
      }
      throw e;
    }
  }

  throw lastError ?? new Error("FAILED_TO_PERFORM_MOVEMENT");
}

async function stockIn(
  tx: Prisma.TransactionClient,
  input: StockInInput,
) {
  const product = await tx.product.findUnique({
    where: { id: input.productId },
    select: { baseUnitId: true },
  });
  if (!product) throw new Error("PRODUCT_NOT_FOUND");

  const baseQty = await convertQuantityToBaseUnit({
    tx,
    productId: input.productId,
    fromUnitId: input.unitId,
    toUnitId: product.baseUnitId,
    quantity: input.quantity,
  });

  const expiryDate = asDate(input.expiryDate);

  const batch = await tx.batch.upsert({
    where: {
      productId_batchNumber: {
        productId: input.productId,
        batchNumber: input.batchNumber,
      },
    },
    update: {
      expiryDate: expiryDate ?? undefined,
      unitCost: input.unitCost,
    },
    create: {
      productId: input.productId,
      batchNumber: input.batchNumber,
      expiryDate,
      unitCost: input.unitCost,
    },
  });

  const existingBalance = await tx.inventoryBalance.findUnique({
    where: { batchId_locationId: { batchId: batch.id, locationId: input.locationId } },
    select: { id: true, quantityOnHand: true, version: true },
  });

  const openingQty = existingBalance?.quantityOnHand ?? 0;
  const closingQty = openingQty + baseQty;

  if (!existingBalance) {
    await tx.inventoryBalance.create({
      data: {
        productId: input.productId,
        batchId: batch.id,
        warehouseId: input.warehouseId,
        locationId: input.locationId,
        quantityOnHand: baseQty,
        quantityReserved: 0,
        version: 0,
      },
    });
  } else {
    const updated = await tx.inventoryBalance.updateMany({
      where: { id: existingBalance.id, version: existingBalance.version },
      data: {
        quantityOnHand: { increment: baseQty },
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) throw new InventoryConcurrencyError();
  }

  const ledgerEntry = {
    productId: input.productId,
    batchId: batch.id,
    warehouseId: input.warehouseId,
    locationId: input.locationId,
    quantityChange: baseQty,
    openingQty,
    closingQty,
    unitCostSnapshot: batch.unitCost,
  };

  const txRow = await tx.stockTransaction.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      type: MovementType.STOCK_IN,
      sourceType: input.sourceType as MovementSourceType,
      performedById: input.performedById,
      reasonCode: (input.reasonCode as AdjustmentReason | undefined) ?? undefined,
      reasonNote: input.reasonNote ?? undefined,
      entries: {
        create: [ledgerEntry],
      },
    },
    include: { entries: true },
  });

  await writeAuditLog(tx, {
    entityType: "StockTransaction",
    entityId: txRow.id,
    action: "STOCK_IN",
    performedById: input.performedById,
    afterValue: {
      movementType: input.movementType,
      sourceType: input.sourceType,
      entries: ledgerEntriesToAuditJson([ledgerEntry]),
    },
  });

  await evaluateLowStockScope(tx, {
    productId: input.productId,
    warehouseId: input.warehouseId,
    locationId: input.locationId,
  });

  return txRow;
}

async function stockOut(
  tx: Prisma.TransactionClient,
  input: StockOutInput,
) {
  const product = await tx.product.findUnique({
    where: { id: input.productId },
    select: { baseUnitId: true },
  });
  if (!product) throw new Error("PRODUCT_NOT_FOUND");

  const baseQty = await convertQuantityToBaseUnit({
    tx,
    productId: input.productId,
    fromUnitId: input.unitId,
    toUnitId: product.baseUnitId,
    quantity: input.quantity,
  });

  const lots = await tx.inventoryBalance.findMany({
    where: {
      productId: input.productId,
      warehouseId: input.warehouseId,
      locationId: input.locationId,
      quantityOnHand: { gt: 0 },
    },
    include: {
      batch: {
        select: {
          id: true,
          expiryDate: true,
          receivedAt: true,
          unitCost: true,
        },
      },
    },
  });

  lots.sort((a, b) => {
    const aExpiry = a.batch.expiryDate?.getTime() ?? Infinity;
    const bExpiry = b.batch.expiryDate?.getTime() ?? Infinity;
    if (aExpiry !== bExpiry) return aExpiry - bExpiry;
    return a.batch.receivedAt.getTime() - b.batch.receivedAt.getTime();
  });

  let remaining = baseQty;
  const allocations: Array<{
    balanceId: string;
    batchId: string;
    unitCost: typeof lots[number]["batch"]["unitCost"];
    openingQty: number;
    usedQty: number;
    version: number;
  }> = [];

  for (const lot of lots) {
    if (remaining <= 0) break;
    const available = lot.quantityOnHand;
    if (available <= 0) continue;
    const usedQty = Math.min(available, remaining);
    allocations.push({
      balanceId: lot.id,
      batchId: lot.batchId,
      unitCost: lot.batch.unitCost,
      openingQty: available,
      usedQty,
      version: lot.version,
    });
    remaining -= usedQty;
  }

  if (remaining !== 0) throw new Error("INSUFFICIENT_STOCK");

  const ledgerEntries = allocations.map((a) => ({
    productId: input.productId,
    batchId: a.batchId,
    warehouseId: input.warehouseId,
    locationId: input.locationId,
    quantityChange: -a.usedQty,
    openingQty: a.openingQty,
    closingQty: a.openingQty - a.usedQty,
    unitCostSnapshot: a.unitCost,
  }));

  for (const a of allocations) {
    const updated = await tx.inventoryBalance.updateMany({
      where: { id: a.balanceId, version: a.version },
      data: {
        quantityOnHand: { decrement: a.usedQty },
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) throw new InventoryConcurrencyError();
  }

  const txRow = await tx.stockTransaction.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      type: MovementType.STOCK_OUT,
      sourceType: input.sourceType as MovementSourceType,
      performedById: input.performedById,
      reasonCode: (input.reasonCode as AdjustmentReason | undefined) ?? undefined,
      reasonNote: input.reasonNote ?? undefined,
      entries: { create: ledgerEntries },
    },
    include: { entries: true },
  });

  await writeAuditLog(tx, {
    entityType: "StockTransaction",
    entityId: txRow.id,
    action: "STOCK_OUT",
    performedById: input.performedById,
    afterValue: {
      movementType: input.movementType,
      sourceType: input.sourceType,
      entries: ledgerEntriesToAuditJson(ledgerEntries),
    },
  });

  await evaluateLowStockScope(tx, {
    productId: input.productId,
    warehouseId: input.warehouseId,
    locationId: input.locationId,
  });

  return txRow;
}

async function transfer(
  tx: Prisma.TransactionClient,
  input: TransferInput,
) {
  const product = await tx.product.findUnique({
    where: { id: input.productId },
    select: { baseUnitId: true },
  });
  if (!product) throw new Error("PRODUCT_NOT_FOUND");

  const baseQty = await convertQuantityToBaseUnit({
    tx,
    productId: input.productId,
    fromUnitId: input.unitId,
    toUnitId: product.baseUnitId,
    quantity: input.quantity,
  });

  const sourceLots = await tx.inventoryBalance.findMany({
    where: {
      productId: input.productId,
      warehouseId: input.fromWarehouseId,
      locationId: input.fromLocationId,
      quantityOnHand: { gt: 0 },
    },
    include: {
      batch: {
        select: {
          id: true,
          expiryDate: true,
          receivedAt: true,
          unitCost: true,
        },
      },
    },
  });

  sourceLots.sort((a, b) => {
    const aExpiry = a.batch.expiryDate?.getTime() ?? Infinity;
    const bExpiry = b.batch.expiryDate?.getTime() ?? Infinity;
    if (aExpiry !== bExpiry) return aExpiry - bExpiry;
    return a.batch.receivedAt.getTime() - b.batch.receivedAt.getTime();
  });

  let remaining = baseQty;
  const allocations: Array<{
    balanceId: string;
    batchId: string;
    unitCost: typeof sourceLots[number]["batch"]["unitCost"];
    openingSourceQty: number;
    usedQty: number;
    sourceVersion: number;
  }> = [];

  for (const lot of sourceLots) {
    if (remaining <= 0) break;
    const available = lot.quantityOnHand;
    if (available <= 0) continue;
    const usedQty = Math.min(available, remaining);
    allocations.push({
      balanceId: lot.id,
      batchId: lot.batchId,
      unitCost: lot.batch.unitCost,
      openingSourceQty: available,
      usedQty,
      sourceVersion: lot.version,
    });
    remaining -= usedQty;
  }

  if (remaining !== 0) throw new Error("INSUFFICIENT_STOCK");

  const batchIds = allocations.map((a) => a.batchId);
  const destBalances = await tx.inventoryBalance.findMany({
    where: { batchId: { in: batchIds }, locationId: input.toLocationId },
    select: { id: true, batchId: true, quantityOnHand: true, version: true },
  });
  const destByBatchId = new Map(destBalances.map((b) => [b.batchId, b]));

  type UnitCost = (typeof sourceLots)[number]["batch"]["unitCost"];
  type LedgerEntry = {
    productId: string;
    batchId: string;
    warehouseId: string;
    locationId: string;
    quantityChange: number;
    openingQty: number;
    closingQty: number;
    unitCostSnapshot: UnitCost;
  };

  const ledgerEntries: LedgerEntry[] = [];

  // Update source lots first to preserve FIFO/versions correctness.
  for (const a of allocations) {
    const updated = await tx.inventoryBalance.updateMany({
      where: { id: a.balanceId, version: a.sourceVersion },
      data: {
        quantityOnHand: { decrement: a.usedQty },
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) throw new InventoryConcurrencyError();

    const sourceClosingQty = a.openingSourceQty - a.usedQty;
    ledgerEntries.push({
      productId: input.productId,
      batchId: a.batchId,
      warehouseId: input.fromWarehouseId,
      locationId: input.fromLocationId,
      quantityChange: -a.usedQty,
      openingQty: a.openingSourceQty,
      closingQty: sourceClosingQty,
      unitCostSnapshot: a.unitCost,
    });
  }

  // Then update/create destination balances.
  for (const a of allocations) {
    const existingDest = destByBatchId.get(a.batchId);
    if (!existingDest) {
      await tx.inventoryBalance.create({
        data: {
          productId: input.productId,
          batchId: a.batchId,
          warehouseId: input.toWarehouseId,
          locationId: input.toLocationId,
          quantityOnHand: a.usedQty,
          quantityReserved: 0,
          version: 0,
        },
      });
      ledgerEntries.push({
        productId: input.productId,
        batchId: a.batchId,
        warehouseId: input.toWarehouseId,
        locationId: input.toLocationId,
        quantityChange: a.usedQty,
        openingQty: 0,
        closingQty: a.usedQty,
        unitCostSnapshot: a.unitCost,
      });
      continue;
    }

    const updated = await tx.inventoryBalance.updateMany({
      where: { id: existingDest.id, version: existingDest.version },
      data: {
        quantityOnHand: { increment: a.usedQty },
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) throw new InventoryConcurrencyError();

    const destOpeningQty = existingDest.quantityOnHand;
    ledgerEntries.push({
      productId: input.productId,
      batchId: a.batchId,
      warehouseId: input.toWarehouseId,
      locationId: input.toLocationId,
      quantityChange: a.usedQty,
      openingQty: destOpeningQty,
      closingQty: destOpeningQty + a.usedQty,
      unitCostSnapshot: a.unitCost,
    });
  }

  const txRow = await tx.stockTransaction.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      type: MovementType.TRANSFER,
      sourceType: input.sourceType as MovementSourceType,
      performedById: input.performedById,
      reasonCode: (input.reasonCode as AdjustmentReason | undefined) ?? undefined,
      reasonNote: input.reasonNote ?? undefined,
      entries: { create: ledgerEntries },
    },
    include: { entries: true },
  });

  await writeAuditLog(tx, {
    entityType: "StockTransaction",
    entityId: txRow.id,
    action: "TRANSFER",
    performedById: input.performedById,
    afterValue: {
      movementType: input.movementType,
      sourceType: input.sourceType,
      entries: ledgerEntriesToAuditJson(ledgerEntries),
    },
  });

  await evaluateLowStockScope(tx, {
    productId: input.productId,
    warehouseId: input.fromWarehouseId,
    locationId: input.fromLocationId,
  });
  await evaluateLowStockScope(tx, {
    productId: input.productId,
    warehouseId: input.toWarehouseId,
    locationId: input.toLocationId,
  });

  return txRow;
}

async function adjustment(
  tx: Prisma.TransactionClient,
  input: AdjustmentInput,
) {
  const product = await tx.product.findUnique({
    where: { id: input.productId },
    select: { baseUnitId: true },
  });
  if (!product) throw new Error("PRODUCT_NOT_FOUND");

  const baseQty = await convertQuantityToBaseUnit({
    tx,
    productId: input.productId,
    fromUnitId: input.unitId,
    toUnitId: product.baseUnitId,
    quantity: input.quantity,
  });

  if (baseQty < 0) throw new Error("INVALID_ADJUSTMENT_QUANTITY");

  const expiryDate = asDate(input.expiryDate);

  const batch = await tx.batch.findUnique({
    where: {
      productId_batchNumber: {
        productId: input.productId,
        batchNumber: input.batchNumber,
      },
    },
    select: { id: true, unitCost: true },
  });

  const finalBatch =
    batch ??
    (await tx.batch.create({
      data: {
        productId: input.productId,
        batchNumber: input.batchNumber,
        expiryDate,
        unitCost: input.unitCost ?? (() => {
          throw new Error("unitCost is required when creating a new batch in ADJUSTMENT");
        })(),
      },
      select: { id: true, unitCost: true },
    }));

  const existingBalance = await tx.inventoryBalance.findUnique({
    where: {
      batchId_locationId: {
        batchId: finalBatch.id,
        locationId: input.locationId,
      },
    },
    select: { id: true, quantityOnHand: true, version: true },
  });

  const openingQty = existingBalance?.quantityOnHand ?? 0;
  const closingQty = baseQty;
  const delta = closingQty - openingQty;

  if (!existingBalance) {
    if (closingQty < 0) throw new Error("INVALID_ADJUSTMENT_QUANTITY");
    await tx.inventoryBalance.create({
      data: {
        productId: input.productId,
        batchId: finalBatch.id,
        warehouseId: input.warehouseId,
        locationId: input.locationId,
        quantityOnHand: closingQty,
        quantityReserved: 0,
        version: 0,
      },
    });
  } else {
    const updated = await tx.inventoryBalance.updateMany({
      where: { id: existingBalance.id, version: existingBalance.version },
      data: {
        quantityOnHand: { increment: delta },
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) throw new InventoryConcurrencyError();
  }

  const ledgerEntry = {
    productId: input.productId,
    batchId: finalBatch.id,
    warehouseId: input.warehouseId,
    locationId: input.locationId,
    quantityChange: delta,
    openingQty,
    closingQty,
    unitCostSnapshot: finalBatch.unitCost,
  };

  const txRow = await tx.stockTransaction.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      type: MovementType.ADJUSTMENT,
      sourceType: input.sourceType as MovementSourceType,
      performedById: input.performedById,
      reasonCode: (input.reasonCode as AdjustmentReason | undefined) ?? undefined,
      reasonNote: input.reasonNote ?? undefined,
      entries: {
        create: [ledgerEntry],
      },
    },
    include: { entries: true },
  });

  await writeAuditLog(tx, {
    entityType: "StockTransaction",
    entityId: txRow.id,
    action: "ADJUSTMENT",
    performedById: input.performedById,
    afterValue: {
      movementType: input.movementType,
      sourceType: input.sourceType,
      entries: ledgerEntriesToAuditJson([ledgerEntry]),
    },
  });

  await evaluateLowStockScope(tx, {
    productId: input.productId,
    warehouseId: input.warehouseId,
    locationId: input.locationId,
  });

  return txRow;
}

