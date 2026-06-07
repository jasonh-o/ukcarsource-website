import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { generateOutreach } from '@/lib/ai'

const schema = z.object({
  leadId: z.string(),
  channel: z.enum(['email', 'whatsapp', 'linkedin']),
  tone: z.enum(['formal', 'friendly', 'direct']).optional(),
  angle: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { leadId, channel, tone, angle } = schema.parse(body)

  const lead = await db.lead.findUnique({ where: { id: leadId } })
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const result = await generateOutreach(
    {
      companyName: lead.companyName,
      contactName: lead.contactName,
      country: lead.country,
      city: lead.city,
      vehicleSpecialty: lead.vehicleSpecialty,
      website: lead.website,
      notes: lead.notes,
      stage: lead.stage,
    },
    { channel, tone, angle }
  )

  return NextResponse.json(result)
}
