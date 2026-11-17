export const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;

export function isAdminRole(role: unknown) {
  return typeof role === "string" && (ADMIN_ROLES as readonly string[]).includes(role);
}

export function isSuperAdminRole(role: unknown) {
  return role === "SUPER_ADMIN";
}
