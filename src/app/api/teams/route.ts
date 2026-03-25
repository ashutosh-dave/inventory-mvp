import { prisma } from "@/lib/prisma";
import { fromError, ok } from "@/lib/api-response";
import { canAccessDepartment } from "@/lib/rbac";
import { requirePermission } from "@/lib/api-auth";
import { teamSchema } from "@/lib/validators";

export async function GET() {
  try {
    const user = await requirePermission("team:manage");
    const data = await prisma.team.findMany({
      orderBy: { name: "asc" },
      include: { members: true, department: true },
      where:
        user.role === "ADMIN"
          ? undefined
          : {
              OR: [{ departmentId: user.departmentId }, { departmentId: null }],
            },
    });
    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("team:manage");
    const parsed = teamSchema.parse(await request.json());
    if (!canAccessDepartment(user.departmentId, parsed.departmentId, user.role)) {
      throw new Error("FORBIDDEN");
    }
    const data = await prisma.team.create({ data: parsed });
    return ok(data, 201);
  } catch (error) {
    return fromError(error);
  }
}
