import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fromError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/api-auth";
import { teamSchema } from "@/lib/validators";
import { idSchema } from "@/lib/validators";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    await requirePermission("team:manage");
    const { teamId: teamIdParam } = await context.params;
    const teamId = idSchema.parse(teamIdParam);
    const data = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true, department: true },
    });
    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    await requirePermission("team:manage");
    const { teamId: teamIdParam } = await context.params;
    const teamId = idSchema.parse(teamIdParam);
    const parsed = teamSchema.parse(await request.json());
    const data = await prisma.team.update({
      where: { id: teamId },
      data: parsed,
    });
    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    await requirePermission("team:manage");
    const { teamId: teamIdParam } = await context.params;
    const teamId = idSchema.parse(teamIdParam);
    const data = await prisma.team.delete({ where: { id: teamId } });
    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

