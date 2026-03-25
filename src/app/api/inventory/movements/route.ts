import { z } from "zod";
import type { NextRequest } from "next/server";
import { requirePermission } from "@/lib/api-auth";
import { fromError, ok } from "@/lib/api-response";
import { performMovement } from "@/lib/inventory/service";
import {
  AdjustmentReason,
  MovementSourceType,
  MovementType,
} from "../../../../generated/prisma/enums";

const adjustmentReasonValues = Object.values(
  AdjustmentReason,
) as [string, ...string[]];
const movementSourceTypeValues = Object.values(
  MovementSourceType,
) as [string, ...string[]];

const adjustmentReasonSchema = z.enum(adjustmentReasonValues);
const movementSourceTypeSchema = z.enum(movementSourceTypeValues);

const movementBaseSchema = z.object({
  idempotencyKey: z.string().min(1),
  reasonCode: adjustmentReasonSchema.optional(),
  reasonNote: z.string().min(1).optional(),
});

const stockInSchema = movementBaseSchema.extend({
  movementType: z.literal(MovementType.STOCK_IN),
  sourceType: movementSourceTypeSchema.default(MovementSourceType.PURCHASE),
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  locationId: z.string().min(1),
  batchNumber: z.string().min(1),
  expiryDate: z.string().datetime().optional().nullable(),
  unitId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  unitCost: z.coerce.number().positive(),
});

const stockOutSchema = movementBaseSchema.extend({
  movementType: z.literal(MovementType.STOCK_OUT),
  sourceType: movementSourceTypeSchema.default(MovementSourceType.SALE),
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  locationId: z.string().min(1),
  unitId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
});

const transferSchema = movementBaseSchema.extend({
  movementType: z.literal(MovementType.TRANSFER),
  sourceType: z.literal(MovementSourceType.TRANSFER),
  productId: z.string().min(1),
  fromWarehouseId: z.string().min(1),
  fromLocationId: z.string().min(1),
  toWarehouseId: z.string().min(1),
  toLocationId: z.string().min(1),
  unitId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
});

const adjustmentSchema = movementBaseSchema.extend({
  movementType: z.literal(MovementType.ADJUSTMENT),
  sourceType: z.literal(MovementSourceType.ADJUSTMENT),
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  locationId: z.string().min(1),
  batchNumber: z.string().min(1),
  expiryDate: z.string().datetime().optional().nullable(),
  unitId: z.string().min(1),
  quantity: z.coerce.number().int().min(0),
  unitCost: z.coerce.number().positive().optional(),
});

const movementSchema = z.discriminatedUnion("movementType", [
  stockInSchema,
  stockOutSchema,
  transferSchema,
  adjustmentSchema,
]);

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("inventory:write");
    const parsed = movementSchema.parse(await request.json());
    const result = await performMovement({
      ...parsed,
      performedById: user.id,
    });
    return ok(result, 201);
  } catch (error) {
    return fromError(error);
  }
}

