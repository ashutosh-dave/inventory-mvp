import { prisma } from "@/lib/prisma";
import { fromError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/api-auth";
import { idSchema, teamMemberSchema } from "@/lib/validators";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("team:manage");
    const url = new URL(request.url);
    const teamIdParam = url.searchParams.get("teamId");
    const where = teamIdParam ? { teamId: idSchema.parse(teamIdParam) } : undefined;

    const data = await prisma.teamMember.findMany({
      where,
      orderBy: { joinedAt: "desc" },
      include: {
        user: { select: { id: true, email: true, name: true, role: true, isActive: true } },
        team: { include: { department: true } },
      },
    });
    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission("team:manage");
    const parsed = teamMemberSchema.parse(await request.json());
    const data = await prisma.teamMember.upsert({
      where: { userId_teamId: { userId: parsed.userId, teamId: parsed.teamId } },
      update: {},
      create: parsed,
    });
    return ok(data, 201);
  } catch (error) {
    return fromError(error);
  }
}

