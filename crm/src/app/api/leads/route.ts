import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, parseLead, stringifyArray } from '@/lib/db'
import { scoreLead } from '@/lib/ai'

const createLeadSchema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().optional(),
  country: z.string().min(1),
  city: z.string().optional(),
  website: z.string().optional(),
  email: z.string().optional(),
  whatsapp: z.string().optional(),
  phone: z.string().optional(),
  facebookPage: z.string().optional(),
  linkedinPage: z.string().optional(),
  vehicleSpecialty: z.array(z.string()).default([]),
  estimatedSize: z.string().optional(),
  source: z.string().default('MANUAL'),
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
      { companyName: { contains: search } },
      { contactName: { contains: search } },
      { email: { contains: search } },
    ]
  }

  const [rawLeads, total] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { activities: true, outreachLogs: true } } },
    }),
    db.lead.count({ where }),
  ])

  const leads = rawLeads.map(parseLead)
  return NextResponse.json({ leads, total, page, limit })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const data = createLeadSchema.parse(body)

  const lead = await db.lead.create({
    data: {
      companyName: data.companyName,
      contactName: data.contactName,
      country: data.country,
      city: data.city,
      website: data.website || null,
      email: data.email || null,
      whatsapp: data.whatsapp,
      phone: data.phone,
      facebookPage: data.facebookPage,
      linkedinPage: data.linkedinPage,
      vehicleSpecialty: stringifyArray(data.vehicleSpecialty),
      estimatedSize: data.estimatedSize,
      source: data.source,
      tags: stringifyArray(data.tags),
      notes: data.notes,
    },
  })

  // Auto-score in background
  scoreLead({
    companyName: lead.companyName,
    contactName: lead.contactName,
    country: lead.country,
    city: lead.city,
    vehicleSpecialty: data.vehicleSpecialty,
    website: lead.website,
    notes: lead.notes,
    stage: lead.stage,
  })
    .then(({ score }) => db.lead.update({ where: { id: lead.id }, data: { score } }))
    .catch(console.error)

  return NextResponse.json(parseLead(lead), { status: 201 })
}
