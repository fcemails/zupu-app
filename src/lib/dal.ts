import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getSession } from './session'
import { prisma } from './prisma'
import type { Role } from './permissions'

export const verifySession = cache(async () => {
  const session = await getSession()
  if (!session?.userId) redirect('/login')
  return session
})

export const getMyFamilies = cache(async () => {
  const session = await verifySession()
  return prisma.familyAccess.findMany({
    where: { userId: session.userId },
    include: {
      family: {
        include: {
          _count: { select: { members: true, events: true } },
        },
      },
    },
    orderBy: { family: { createdAt: 'asc' } },
  })
})

export const getFamily = cache(async (familyId: string) => {
  const session = await verifySession()
  const access = await prisma.familyAccess.findUnique({
    where: { userId_familyId: { userId: session.userId, familyId } },
    include: { family: true },
  })
  if (!access) redirect('/families')
  return { family: access.family, role: access.role as Role }
})
