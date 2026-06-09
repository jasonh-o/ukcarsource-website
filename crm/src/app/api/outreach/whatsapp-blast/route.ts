import { NextRequest, NextResponse } from 'next/server'
import { db, parseLead } from '@/lib/db'
import { generateOutreach } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const { stage, country, limit = 10 } = await req.json()

  const where: Record<string, unknown> = {
    optedOut: false,
    whatsapp: { not: null },
    stage: stage || { in: ['NEW', 'ENRICHED'] },
  }
  if (country) where.country = country

  const rawLeads = await db.lead.findMany({
    where,
    orderBy: { score: 'desc' },
    take: Math.min(limit, 20),
  })

  const leads = rawLeads.map(parseLead)

  const results = []

  for (const lead of leads) {
    if (!lead.whatsapp) continue

    const aiResult = await generateOutreach(
      {
        companyName: lead.companyName,
        contactName: lead.contactName,
        country: lead.country,
        city: lead.city,
        vehicleSpecialty: lead.vehicleSpecialty as string[],
        website: lead.website,
        notes: lead.notes,
        stage: lead.stage,
      },
      { channel: 'whatsapp', tone: 'friendly' }
    )

    const num = lead.whatsapp.replace(/\D/g, '')
    const waUrl = `https://web.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(aiResult.body)}`

    results.push({
      id: lead.id,
      company: lead.companyName,
      country: lead.country,
      whatsapp: lead.whatsapp,
      message: aiResult.body,
      waUrl,
    })
  }

  return NextResponse.json({ count: results.length, results })
}
