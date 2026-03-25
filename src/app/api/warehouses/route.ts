import { prisma } from "@/lib/prisma";
import { fromError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/api-auth";
import { warehouseSchema } from "@/lib/validators";

export async function GET() {
  try {
    const data = await prisma.warehouse.findMany({
      orderBy: { code: "asc" },
      include: { locations: true },
    });
    return ok(data);
  } catch (error) {
    return fromError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission("warehouse:manage");
    const parsed = warehouseSchema.parse(await request.json());
    const data = await prisma.warehouse.create({ data: parsed });
    return ok(data, 201);
  } catch (error) {
    return fromError(error);
  }
}

