import { NextRequest, NextResponse } from 'next/server'
import { generateOutreach } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const { company, country, specialty, channel, tone } = await req.json()

    const result = await generateOutreach(
      {
        companyName: company,
        country,
        vehicleSpecialty: specialty ? [specialty] : [],
        stage: 'NEW',
      },
      { channel: channel || 'email', tone: tone || 'friendly' }
    )

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
