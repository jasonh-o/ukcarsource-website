import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const schema = z.object({
  type: z.enum(['NOTE', 'EMAIL_SENT', 'EMAIL_OPENED', 'EMAIL_REPLIED', 'WHATSAPP_SENT', 'WHATSAPP_REPLIED', 'LINKEDIN_CONNECTED', 'CALL', 'MEETING', 'STAGE_CHANGED', 'SCORE_UPDATED']),
  note: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const data = schema.parse(body)

  const activity = await db.activity.create({
    data: { leadId: params.id, ...data },
  })

  return NextResponse.json(activity, { status: 201 })
}
