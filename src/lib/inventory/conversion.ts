import type { Prisma } from "@/generated/prisma/client";

export function convertMultiplierToInt(
  multiplier: { toNumber: () => number },
  quantity: number,
) {
  const raw = multiplier.toNumber() * quantity;
  // FIFO/movement quantities are stored as Ints; enforce integer conversions.
  if (!Number.isFinite(raw) || !Number.isInteger(raw)) {
    throw new Error(
      `Unit conversion produced a non-integer base quantity (${raw}).`,
    );
  }
  return raw;
}

export async function convertQuantityToBaseUnit(params: {
  tx: Prisma.TransactionClient;
  productId: string;
  fromUnitId: string;
  toUnitId: string;
  quantity: number;
}) {
  const { tx, productId, fromUnitId, toUnitId, quantity } = params;

  if (fromUnitId === toUnitId) return quantity;

  const conversion = await tx.productUnitConversion.findFirst({
    where: { productId, fromUnitId, toUnitId },
    select: { multiplier: true },
  });

  if (!conversion) {
    throw new Error(
      `Missing unit conversion for product ${productId}: ${fromUnitId} -> ${toUnitId}`,
    );
  }

  return convertMultiplierToInt(conversion.multiplier, quantity);
}

