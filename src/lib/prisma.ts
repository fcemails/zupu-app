import { PrismaClient } from '@/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

// In production, DATABASE_URL=file:/data/zupu.db (absolute) overrides the dev default.
// For dev, relative file: URLs resolve relative to the repo root so file:./dev.db works.
const url = process.env.DATABASE_URL
const dbPath = (() => {
  if (!url?.startsWith('file:')) {
    return path.resolve(process.cwd(), 'dev.db')
  }

  const sqlitePath = url.slice('file:'.length)
  return path.isAbsolute(sqlitePath)
    ? sqlitePath
    : path.resolve(process.cwd(), sqlitePath)
})()

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrisma() {
  const adapter = new PrismaBetterSqlite3({ url: dbPath })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma || createPrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
