import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/permissions'

type Ctx = { params: Promise<{ id: string; accessId: string }> }

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id: familyId, accessId } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await requireRole(session.userId, familyId, 'owner')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const access = await prisma.familyAccess.findUnique({ where: { id: accessId } })
  if (!access || access.familyId !== familyId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (access.role === 'owner') {
    return NextResponse.json({ error: '不能移除谱主' }, { status: 400 })
  }

  await prisma.familyAccess.delete({ where: { id: accessId } })
  return new NextResponse(null, { status: 204 })
}
