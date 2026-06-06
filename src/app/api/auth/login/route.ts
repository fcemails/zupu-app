import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/session'
import { jsonError, jsonOK } from '@/lib/apiResponse'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return jsonError('INVALID_PARAMS', '请填写邮箱和密码', 400)
    }
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      return jsonError('UNAUTHORIZED', '邮箱或密码错误', 401)
    }
    await createSession(user.id, user.name)
    return jsonOK({ ok: true })
  } catch (err) {
    console.error('[auth/login]', err)
    return jsonError('SERVER_ERROR', '服务器错误，请稍后重试', 500)
  }
}
