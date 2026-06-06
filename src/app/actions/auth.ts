'use server'

import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
// redirect is still used by logout()
import { createSession, deleteSession } from '@/lib/session'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
})

export type AuthState = { error?: string; redirectTo?: string } | undefined

export async function login(state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: '请填写正确的邮箱和密码' }
  }
  const { email, password } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.password) {
    return { error: '邮箱或密码错误' }
  }
  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return { error: '邮箱或密码错误' }
  }
  await createSession(user.id, user.name)
  // Return redirect target instead of calling redirect() directly.
  // redirect() inside a Server Action in production (standalone) has a race
  // condition where the Set-Cookie header may not be committed before the RSC
  // navigation request fires, causing "This page couldn't load". Letting the
  // client component call router.push() after the action settles guarantees
  // the cookie is stored first.
  return { redirectTo: '/families' }
}

export async function register(state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = RegisterSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    const msgs = parsed.error.issues.map(i => i.message).join('；')
    return { error: msgs }
  }
  const { name, email, password } = parsed.data
  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) {
    return { error: '该邮箱已注册，请直接登录' }
  }
  const hashed = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({ data: { name, email, password: hashed } })
  await createSession(user.id, user.name)
  return { redirectTo: '/families' }
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}
