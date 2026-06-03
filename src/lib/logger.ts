export type LoggerMeta = Record<string, unknown>

export function logInfo(message: string, meta: LoggerMeta = {}) {
  if (process.env.NODE_ENV !== 'test') {
    console.info(JSON.stringify({ level: 'info', message, ...meta, timestamp: new Date().toISOString() }))
  }
}

export function logWarn(message: string, meta: LoggerMeta = {}) {
  if (process.env.NODE_ENV !== 'test') {
    console.warn(JSON.stringify({ level: 'warn', message, ...meta, timestamp: new Date().toISOString() }))
  }
}

export function logError(error: unknown, meta: LoggerMeta = {}) {
  if (process.env.NODE_ENV !== 'test') {
    const errorPayload = error instanceof Error ? { message: error.message, stack: error.stack } : { value: error }
    console.error(JSON.stringify({ level: 'error', ...errorPayload, ...meta, timestamp: new Date().toISOString() }))
  }
}
