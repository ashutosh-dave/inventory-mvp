import { prisma } from "@/lib/prisma";
import { fromError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/api-auth";
import { categorySchema } from "@/lib/validators";

export async function GET() {
  try {
    const data = await prisma.productCategory.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission("inventory:write");
    const parsed = categorySchema.parse(await request.json());
    const data = await prisma.productCategory.create({ data: parsed });
    return ok(data, 201);
  } catch (error) {
    return fromError(error);
  }
}

