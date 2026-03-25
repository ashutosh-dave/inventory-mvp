import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fromError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/api-auth";
import { categorySchema, idSchema } from "@/lib/validators";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ categoryId: string }> },
) {
  try {
    const { categoryId: categoryIdParam } = await context.params;
    const categoryId = idSchema.parse(categoryIdParam);
    const data = await prisma.productCategory.findUnique({
      where: { id: categoryId },
      include: { products: true },
    });
    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ categoryId: string }> },
) {
  try {
    await requirePermission("inventory:write");
    const { categoryId: categoryIdParam } = await context.params;
    const categoryId = idSchema.parse(categoryIdParam);
    const parsed = categorySchema.parse(await request.json());
    const data = await prisma.productCategory.update({
      where: { id: categoryId },
      data: parsed,
    });
    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ categoryId: string }> },
) {
  try {
    await requirePermission("category:delete");
    const { categoryId: categoryIdParam } = await context.params;
    const categoryId = idSchema.parse(categoryIdParam);

    const data = await prisma.productCategory.update({
      where: { id: categoryId },
      data: { deletedAt: new Date() },
    });
    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

