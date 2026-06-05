import { PrismaClient } from '@/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

// Prisma CLI resolves relative file: URLs from the schema.prisma directory (prisma/).
// The runtime must use the same base so both point to the same database file.
const url = process.env.DATABASE_URL
const dbPath = (() => {
  const filePath = url?.startsWith('file:') ? url.slice('file:'.length) : 'dev.db'
  if (path.isAbsolute(filePath)) return filePath
  return path.resolve(process.cwd(), 'prisma', filePath)
})()

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrisma() {
  const adapter = new PrismaBetterSqlite3({ url: dbPath })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma || createPrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
