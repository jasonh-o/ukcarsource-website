import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// SQLite stores arrays as JSON strings — these helpers normalise them
export function parseLead<T extends { vehicleSpecialty: unknown; tags: unknown }>(lead: T) {
  return {
    ...lead,
    vehicleSpecialty: parseJsonArray(lead.vehicleSpecialty),
    tags: parseJsonArray(lead.tags),
  }
}

export function parseTemplate<T extends { variables: unknown; tags: unknown }>(t: T) {
  return {
    ...t,
    variables: parseJsonArray(t.variables),
    tags: parseJsonArray(t.tags),
  }
}

export function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { return [] }
  }
  return []
}

export function stringifyArray(arr: string[]): string {
  return JSON.stringify(arr)
}
