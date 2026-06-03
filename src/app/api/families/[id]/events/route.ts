import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/permissions'
import { z } from 'zod'
import { jsonError, jsonOK } from '@/lib/apiResponse'

const EventSchema = z.object({
  year: z.number().int().optional(),
  yearText: z.string().optional(),
  title: z.string().min(1),
  desc: z.string().optional(),
  actors: z.array(z.string()).optional(),
  major: z.boolean().default(false),
})

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { id: familyId } = await params
  const session = await getSession()
  if (!session) return jsonError('UNAUTHORIZED', 'Unauthorized', 401)

  try {
    await requireRole(session.userId, familyId, 'viewer')
  } catch {
    return jsonError('FORBIDDEN', 'Forbidden', 403)
  }

  const events = await prisma.familyEvent.findMany({
    where: { familyId },
    orderBy: [{ year: 'desc' }, { id: 'desc' }],
  })
  return jsonOK(events)
}

export async function POST(req: Request, { params }: Ctx) {
  const { id: familyId } = await params
  const session = await getSession()
  if (!session) return jsonError('UNAUTHORIZED', 'Unauthorized', 401)

  try {
    await requireRole(session.userId, familyId, 'editor')
  } catch {
    return jsonError('FORBIDDEN', 'Forbidden', 403)
  }

  const body = await req.json().catch(() => null)
  const parsed = EventSchema.safeParse(body)
  if (!parsed.success) return jsonError('INVALID_PARAMS', '参数错误', 400)

  const { actors, ...rest } = parsed.data
  const event = await prisma.familyEvent.create({
    data: { ...rest, familyId, actors: actors ? JSON.stringify(actors) : null },
  })
  return jsonOK(event, 201)
}
