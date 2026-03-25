import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fromError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/api-auth";
import { idSchema, teamMemberSchema } from "@/lib/validators";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ teamMemberId: string }> },
) {
  try {
    await requirePermission("team:manage");
    const { teamMemberId: teamMemberIdParam } = await context.params;
    const teamMemberId = idSchema.parse(teamMemberIdParam);
    const parsed = teamMemberSchema.parse(await request.json());

    const data = await prisma.teamMember.update({
      where: { id: teamMemberId },
      data: parsed,
    });
    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ teamMemberId: string }> },
) {
  try {
    await requirePermission("team:manage");
    const { teamMemberId: teamMemberIdParam } = await context.params;
    const teamMemberId = idSchema.parse(teamMemberIdParam);
    const data = await prisma.teamMember.delete({ where: { id: teamMemberId } });
    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

