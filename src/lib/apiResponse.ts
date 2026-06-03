import { NextResponse } from 'next/server'
import { logError } from './logger'

export function jsonError(code: string, message: string, status = 400, details?: unknown) {
  const payload: { error: { code: string; message: string; details?: unknown } } = {
    error: { code, message },
  }
  if (details !== undefined) payload.error.details = details
  return NextResponse.json(payload, { status })
}

export function jsonServerError(error: unknown, context: Record<string, unknown> = {}) {
  logError(error, context)
  return jsonError('SERVER_ERROR', '服务器内部错误', 500)
}

export function jsonOK(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export default jsonError
