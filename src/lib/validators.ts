import { z } from "zod";

export const paginationSchema = z.object({
  take: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

export const idSchema = z.string().cuid();

export const departmentSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

export const teamSchema = z.object({
  name: z.string().min(2),
  departmentId: idSchema.nullish(),
});

export const teamMemberSchema = z.object({
  userId: idSchema,
  teamId: idSchema,
});

export const warehouseSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  isActive: z.boolean().optional(),
});

export const locationSchema = z.object({
  warehouseId: idSchema,
  code: z.string().min(2),
  name: z.string().min(2),
  type: z.enum([
    "MAIN_STORE",
    "DAMAGED_GOODS",
    "ON_TRANSIT",
    "RECEIVING",
    "PICKING",
    "QUARANTINE",
  ]),
  isActive: z.boolean().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

export const productSchema = z.object({
  sku: z.string().min(2),
  name: z.string().min(2),
  categoryId: idSchema,
  baseUnitId: idSchema,
  preferredPurchaseUnitId: idSchema.nullish(),
  preferredSalesUnitId: idSchema.nullish(),
  reorderPoint: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});
