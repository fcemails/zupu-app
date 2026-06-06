import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/session'
import { jsonError, jsonOK } from '@/lib/apiResponse'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()
    if (!name || !email || !password || password.length < 8) {
      return jsonError('INVALID_PARAMS', '请填写所有必填项，密码至少8位', 400)
    }
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
      return jsonError('CONFLICT', '该邮箱已注册，请直接登录', 409)
    }
    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({ data: { name, email, password: hashed } })
    await createSession(user.id, user.name)
    return jsonOK({ ok: true })
  } catch (err) {
    console.error('[auth/register]', err)
    return jsonError('SERVER_ERROR', '服务器错误，请稍后重试', 500)
  }
}
