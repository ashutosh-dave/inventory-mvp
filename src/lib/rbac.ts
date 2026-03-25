import { Role } from "@/generated/prisma/enums";

export type Permission =
  | "inventory:write"
  | "category:delete"
  | "procurement:view"
  | "team:manage"
  | "warehouse:manage";

const rolePermissionMap: Record<Role, Permission[]> = {
  ADMIN: [
    "inventory:write",
    "category:delete",
    "procurement:view",
    "team:manage",
    "warehouse:manage",
  ],
  PROCUREMENT_MANAGER: ["procurement:view"],
  WAREHOUSE_MANAGER: ["inventory:write", "warehouse:manage"],
  WAREHOUSE_USER: ["inventory:write"],
  AUDITOR: [],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissionMap[role].includes(permission);
}

export function canAccessDepartment(
  userDepartmentId: string | null | undefined,
  targetDepartmentId: string | null | undefined,
  role: Role,
): boolean {
  if (role === "ADMIN") return true;
  if (!targetDepartmentId) return true;
  return Boolean(userDepartmentId && userDepartmentId === targetDepartmentId);
}
