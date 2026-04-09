import { PrismaClient } from '@prisma/client'

declare global {
  // allow global `var` across hot-reloads in dev
   
  var prisma: PrismaClient | undefined
}

// Explicitly type exported prisma to ensure consumers see PrismaClient methods/types
export const prisma: PrismaClient = global.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') global.prisma = prisma

