import { prisma } from './prisma'

export type Role = 'owner' | 'admin' | 'editor' | 'viewer'

const ROLE_RANK: Record<Role, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
}

export async function getUserRole(userId: string, familyId: string): Promise<Role | null> {
  const access = await prisma.familyAccess.findUnique({
    where: { userId_familyId: { userId, familyId } },
  })
  return (access?.role as Role) ?? null
}

export async function requireRole(
  userId: string,
  familyId: string,
  minRole: Role,
): Promise<Role> {
  const role = await getUserRole(userId, familyId)
  if (!role || ROLE_RANK[role] < ROLE_RANK[minRole]) {
    throw new Error('FORBIDDEN')
  }
  return role
}

export function hasPermission(role: Role, minRole: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole]
}

export function maskSensitive<T extends Record<string, unknown>>(
  obj: T,
  role: Role | null,
  fields: (keyof T)[],
): T {
  if (role && ROLE_RANK[role] >= ROLE_RANK['editor']) return obj
  const masked = { ...obj }
  for (const f of fields) {
    if (masked[f]) (masked as Record<string, unknown>)[f as string] = null
  }
  return masked
}
