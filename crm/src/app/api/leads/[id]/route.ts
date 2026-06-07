import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const lead = await db.lead.findUnique({
    where: { id: params.id },
    include: {
      activities: { orderBy: { createdAt: 'desc' }, take: 50 },
      outreachLogs: { orderBy: { createdAt: 'desc' }, take: 20, include: { template: true } },
      enquiries: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(lead)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { stage: newStage, ...rest } = body

  const current = await db.lead.findUnique({ where: { id: params.id } })
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const lead = await db.lead.update({
    where: { id: params.id },
    data: { ...rest, ...(newStage ? { stage: newStage } : {}) },
  })

  if (newStage && newStage !== current.stage) {
    await db.activity.create({
      data: {
        leadId: params.id,
        type: 'STAGE_CHANGED',
        note: `Stage changed from ${current.stage} to ${newStage}`,
      },
    })
  }

  return NextResponse.json(lead)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await db.lead.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
