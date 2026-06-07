import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { scoreLead } from '@/lib/ai'

const createLeadSchema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().optional(),
  country: z.string().min(1),
  city: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  phone: z.string().optional(),
  facebookPage: z.string().optional(),
  linkedinPage: z.string().optional(),
  vehicleSpecialty: z.array(z.string()).default([]),
  estimatedSize: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE']).optional(),
  source: z.enum(['MANUAL', 'GOOGLE_MAPS', 'LINKEDIN', 'FACEBOOK', 'DIRECTORY', 'REFERRAL', 'WEBSITE', 'TRADE_SHOW']).default('MANUAL'),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const stage = searchParams.get('stage')
  const country = searchParams.get('country')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')

  const where: Record<string, unknown> = { optedOut: false }
  if (stage) where.stage = stage
  if (country) where.country = country
  if (search) {
    where.OR = [
      { companyName: { contains: search, mode: 'insensitive' } },
      { contactName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [leads, total] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { activities: true, outreachLogs: true } } },
    }),
    db.lead.count({ where }),
  ])

  return NextResponse.json({ leads, total, page, limit })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const data = createLeadSchema.parse(body)

  const lead = await db.lead.create({
    data: {
      ...data,
      website: data.website || null,
      email: data.email || null,
    },
  })

  // Auto-score in background (don't block response)
  scoreLead({
    companyName: lead.companyName,
    contactName: lead.contactName,
    country: lead.country,
    city: lead.city,
    vehicleSpecialty: lead.vehicleSpecialty,
    website: lead.website,
    notes: lead.notes,
    stage: lead.stage,
  })
    .then(({ score }) => db.lead.update({ where: { id: lead.id }, data: { score } }))
    .catch(console.error)

  return NextResponse.json(lead, { status: 201 })
}
