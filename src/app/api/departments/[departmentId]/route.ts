import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fromError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/api-auth";
import { departmentSchema, idSchema } from "@/lib/validators";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ departmentId: string }> },
) {
  try {
    await requirePermission("team:manage");
    const { departmentId: departmentIdParam } = await context.params;
    const departmentId = idSchema.parse(departmentIdParam);
    const data = await prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        users: { select: { id: true, email: true, name: true, role: true, isActive: true } },
        teams: true,
      },
    });
    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ departmentId: string }> },
) {
  try {
    await requirePermission("team:manage");
    const { departmentId: departmentIdParam } = await context.params;
    const departmentId = idSchema.parse(departmentIdParam);
    const parsed = departmentSchema.parse(await request.json());
    const data = await prisma.department.update({
      where: { id: departmentId },
      data: parsed,
    });
    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ departmentId: string }> },
) {
  try {
    await requirePermission("team:manage");
    const { departmentId: departmentIdParam } = await context.params;
    const departmentId = idSchema.parse(departmentIdParam);
    const data = await prisma.department.delete({ where: { id: departmentId } });
    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

