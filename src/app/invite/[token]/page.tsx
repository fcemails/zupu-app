import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

type Props = { params: Promise<{ token: string }> }

export default async function InviteTokenPage({ params }: Props) {
  const { token } = await params
  const session = await getSession()

  if (!session) {
    redirect(`/login?next=/invite/${token}`)
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { family: true },
  })

  if (!invitation || invitation.usedAt || invitation.expiresAt < new Date()) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 600, marginBottom: 8 }}>邀请链接已失效</div>
          <p style={{ color: 'var(--ink-3)' }}>该邀请链接已过期或已被使用，请联系族谱管理员重新发送邀请。</p>
          <a href="/families" className="btn primary" style={{ marginTop: 16 }}>返回首页</a>
        </div>
      </div>
    )
  }

  // Check if already a member
  const existing = await prisma.familyAccess.findUnique({
    where: { userId_familyId: { userId: session.userId, familyId: invitation.familyId } },
  })

  if (!existing) {
    await prisma.familyAccess.create({
      data: { userId: session.userId, familyId: invitation.familyId, role: invitation.role },
    })
  }

  await prisma.invitation.update({ where: { token }, data: { usedAt: new Date() } })

  redirect(`/families/${invitation.familyId}/dashboard`)
}
