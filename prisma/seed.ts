import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, Role, LocationType } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL env var");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function main() {
  const [opsDept, whDept] = await Promise.all([
    prisma.department.upsert({
      where: { name: "Operations" },
      update: {},
      create: { name: "Operations" },
    }),
    prisma.department.upsert({
      where: { name: "Warehouse" },
      update: {},
      create: { name: "Warehouse" },
    }),
  ]);

  const passwordHash = await bcrypt.hash("Password123!", 10);

  await Promise.all([
    upsertUser("admin@erp.local", "Admin", Role.ADMIN, opsDept.id, passwordHash),
    upsertUser(
      "manager@erp.local",
      "Warehouse Manager",
      Role.WAREHOUSE_MANAGER,
      whDept.id,
      passwordHash,
    ),
    upsertUser(
      "user@erp.local",
      "Warehouse User",
      Role.WAREHOUSE_USER,
      whDept.id,
      passwordHash,
    ),
  ]);

  const team = await prisma.team.upsert({
    where: { name_departmentId: { name: "Core Warehouse Team", departmentId: whDept.id } },
    update: {},
    create: { name: "Core Warehouse Team", departmentId: whDept.id },
  });

  const warehouseUser = await prisma.user.findUniqueOrThrow({
    where: { email: "user@erp.local" },
  });
  await prisma.teamMember.upsert({
    where: { userId_teamId: { userId: warehouseUser.id, teamId: team.id } },
    update: {},
    create: { userId: warehouseUser.id, teamId: team.id },
  });

  const warehouse = await prisma.warehouse.upsert({
    where: { code: "WH-MAIN" },
    update: {},
    create: { code: "WH-MAIN", name: "Main Warehouse" },
  });

  const locations = [
    { code: "MAIN", name: "Main Store", type: LocationType.MAIN_STORE },
    { code: "DMG", name: "Damaged Goods", type: LocationType.DAMAGED_GOODS },
    { code: "TRANSIT", name: "On Transit", type: LocationType.ON_TRANSIT },
  ];

  for (const location of locations) {
    await prisma.inventoryLocation.upsert({
      where: { warehouseId_code: { warehouseId: warehouse.id, code: location.code } },
      update: {},
      create: { warehouseId: warehouse.id, ...location },
    });
  }

  const piece = await prisma.unit.upsert({
    where: { code: "PCS" },
    update: {},
    create: { code: "PCS", name: "Pieces" },
  });

  const crate = await prisma.unit.upsert({
    where: { code: "CRT" },
    update: {},
    create: { code: "CRT", name: "Crate" },
  });

  const existingCategory = await prisma.productCategory.findFirst({
    where: { name: "Beverages", deletedAt: null },
  });

  const category =
    existingCategory ??
    (await prisma.productCategory.create({
      data: { name: "Beverages" },
    }));

  const product = await prisma.product.upsert({
    where: { sku: "SKU-COLA-001" },
    update: {},
    create: {
      sku: "SKU-COLA-001",
      name: "Cola Drink",
      categoryId: category.id,
      baseUnitId: piece.id,
      preferredPurchaseUnitId: crate.id,
      preferredSalesUnitId: piece.id,
      reorderPoint: 24,
    },
  });

  await prisma.productUnitConversion.upsert({
    where: {
      productId_fromUnitId_toUnitId: {
        productId: product.id,
        fromUnitId: crate.id,
        toUnitId: piece.id,
      },
    },
    update: { multiplier: "24" },
    create: {
      productId: product.id,
      fromUnitId: crate.id,
      toUnitId: piece.id,
      multiplier: "24",
      isDefaultIn: true,
      isDefaultOut: true,
    },
  });
}

async function upsertUser(
  email: string,
  name: string,
  role: Role,
  departmentId: string,
  passwordHash: string,
) {
  await prisma.user.upsert({
    where: { email },
    update: { name, role, departmentId, passwordHash, isActive: true },
    create: { email, name, role, departmentId, passwordHash, isActive: true },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
