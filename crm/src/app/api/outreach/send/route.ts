import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { sendEmail, wrapEmailHtml } from '@/lib/email'
import crypto from 'crypto'

const schema = z.object({
  leadId: z.string(),
  channel: z.enum(['EMAIL', 'WHATSAPP', 'LINKEDIN', 'FACEBOOK']),
  subject: z.string().optional(),
  body: z.string().min(1),
  templateId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const data = schema.parse(body)

  const lead = await db.lead.findUnique({ where: { id: data.leadId } })
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  if (lead.optedOut) return NextResponse.json({ error: 'Lead has opted out' }, { status: 400 })

  const log = await db.outreachLog.create({
    data: {
      leadId: data.leadId,
      channel: data.channel,
      subject: data.subject,
      body: data.body,
      templateId: data.templateId,
      status: 'PENDING',
    },
  })

  if (data.channel === 'EMAIL' && lead.email) {
    try {
      const unsubToken = crypto.randomBytes(16).toString('hex')
      const html = wrapEmailHtml(data.body, lead.email, unsubToken)

      const result = await sendEmail({
        to: lead.email,
        subject: data.subject || 'Vehicle Sourcing & Export — UK Car Source',
        html,
        headers: { 'X-CRM-Log-ID': log.id },
      })

      await db.outreachLog.update({
        where: { id: log.id },
        data: { status: 'SENT', sentAt: new Date(), messageId: result?.id },
      })

      await db.lead.update({
        where: { id: data.leadId },
        data: { lastContactedAt: new Date(), stage: lead.stage === 'NEW' || lead.stage === 'ENRICHED' ? 'CONTACTED' : lead.stage },
      })

      await db.activity.create({
        data: { leadId: data.leadId, type: 'EMAIL_SENT', note: `Email sent: "${data.subject}"` },
      })
    } catch (err) {
      await db.outreachLog.update({ where: { id: log.id }, data: { status: 'FAILED' } })
      throw err
    }
  }

  // WhatsApp: generate click-to-chat link (manual send workflow)
  if (data.channel === 'WHATSAPP' && lead.whatsapp) {
    const waNumber = lead.whatsapp.replace(/\D/g, '')
    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(data.body)}`

    await db.outreachLog.update({ where: { id: log.id }, data: { status: 'SENT', sentAt: new Date() } })
    await db.activity.create({
      data: { leadId: data.leadId, type: 'WHATSAPP_SENT', note: 'WhatsApp message queued' },
    })

    return NextResponse.json({ log, whatsappUrl: waUrl })
  }

  return NextResponse.json({ log })
}
