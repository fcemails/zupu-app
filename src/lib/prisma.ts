import { PrismaClient } from '@/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

// In production, DATABASE_URL=file:/data/zupu.db (absolute) overrides the dev default.
// Relative file: URLs keep the existing dev behaviour (prisma/dev.db).
const url = process.env.DATABASE_URL
const dbPath = url?.startsWith('file:/')
  ? url.slice(5)
  : path.resolve(process.cwd(), 'prisma/dev.db')

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrisma() {
  const adapter = new PrismaBetterSqlite3({ url: dbPath })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma || createPrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
