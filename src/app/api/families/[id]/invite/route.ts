import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/permissions'
import { audit } from '@/lib/audit'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { jsonError, jsonOK } from '@/lib/apiResponse'

const InviteSchema = z.object({
  role: z.enum(['admin', 'editor', 'viewer']).default('editor'),
  email: z.string().email().optional(),
  message: z.string().optional(),
})

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Ctx) {
  const { id: familyId } = await params
  const session = await getSession()
  if (!session) return jsonError('UNAUTHORIZED', 'Unauthorized', 401)

  try {
    await requireRole(session.userId, familyId, 'admin')
  } catch {
    return jsonError('FORBIDDEN', 'Forbidden', 403)
  }

  const body = await req.json().catch(() => null)
  const parsed = InviteSchema.safeParse(body)
  if (!parsed.success) return jsonError('INVALID_PARAMS', '参数错误', 400)

  const token = randomBytes(20).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const invitation = await prisma.invitation.create({
    data: { familyId, token, expiresAt, ...parsed.data },
  })

  await audit({
    userId: session.userId,
    familyId,
    action: 'invite.create',
    target: invitation.id,
    details: { role: parsed.data.role, email: parsed.data.email, message: parsed.data.message, expiresAt },
  })

  return jsonOK(invitation, 201)
}
