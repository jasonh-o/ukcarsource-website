import { NextRequest, NextResponse } from 'next/server'
import { db, parseLead } from '@/lib/db'
import { generateOutreach } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const { leadId, channel, tone, angle } = await req.json()

    const raw = await db.lead.findUnique({ where: { id: leadId } })
    if (!raw) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const lead = parseLead(raw)

    const result = await generateOutreach(
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
      { channel: channel || 'email', tone: tone || 'friendly', angle }
    )

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('AI outreach error:', message)
    return NextResponse.json(
      { error: 'AI generation failed. Check ANTHROPIC_API_KEY in .env file.', detail: message },
      { status: 500 }
    )
  }
}
