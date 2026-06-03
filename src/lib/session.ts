import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

if (!process.env.SESSION_SECRET) {
  throw new Error('Missing SESSION_SECRET environment variable')
}

const secret = new TextEncoder().encode(process.env.SESSION_SECRET)
const COOKIE_NAME = 'zupu_session'
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000 // 30 days in ms

export type SessionPayload = {
  userId: string
  name: string
  exp?: number
}

export async function encrypt(payload: SessionPayload) {
  // setExpirationTime accepts numeric seconds or strings like '30d'
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    // setExpirationTime expects either a relative string (e.g. '30d') or
    // an absolute timestamp (seconds since epoch). Use an absolute
    // expiration timestamp to avoid treating the duration as an epoch.
    .setExpirationTime(Math.floor(Date.now() / 1000) + Math.floor(SESSION_DURATION / 1000))
    .sign(secret)
}

export async function decrypt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
    return payload as SessionPayload
  } catch {
    return null
  }
}

export async function createSession(userId: string, name: string) {
  const token = await encrypt({ userId, name })
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  })
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return decrypt(token)
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
