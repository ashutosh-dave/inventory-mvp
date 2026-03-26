import { prisma } from "@/lib/prisma";
import { fromError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/api-auth";
import { departmentSchema } from "@/lib/validators";

export async function GET() {
  try {
    await requirePermission("team:manage");
    const data = await prisma.department.findMany({
      orderBy: { name: "asc" },
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

export async function POST(request: Request) {
  try {
    await requirePermission("team:manage");
    const parsed = departmentSchema.parse(await request.json());
    const data = await prisma.department.create({ data: parsed });
    return ok(data, 201);
  } catch (error) {
    return fromError(error);
  }
}
