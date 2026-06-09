import { NextRequest, NextResponse } from 'next/server'
import { db, parseLead } from '@/lib/db'
import { generateOutreach } from '@/lib/ai'
import { sendEmail, wrapEmailHtml } from '@/lib/email'
import crypto from 'crypto'

// Safety limits — keep reputation clean
const MAX_PER_RUN = 20
const DELAY_MS = 3000 // 3 seconds between sends

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function POST(req: NextRequest) {
  const { stage, country, limit = 10, dryRun = false } = await req.json()

  // Only send to leads with email, not opted out, not already contacted today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const where: Record<string, unknown> = {
    optedOut: false,
    email: { not: null },
    stage: stage || { in: ['NEW', 'ENRICHED'] },
  }
  if (country) where.country = country

  const rawLeads = await db.lead.findMany({
    where,
    orderBy: { score: 'desc' },
    take: Math.min(limit, MAX_PER_RUN),
  })

  const leads = rawLeads.map(parseLead)

  if (leads.length === 0) {
    return NextResponse.json({ message: 'No eligible leads found', sent: 0, results: [] })
  }

  const results: Array<{ id: string; company: string; email: string; status: string; subject?: string }> = []

  for (const lead of leads) {
    if (!lead.email) continue

    try {
      // Generate personalised email
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
        { channel: 'email', tone: 'friendly' }
      )

      if (dryRun) {
        results.push({ id: lead.id, company: lead.companyName, email: lead.email, status: 'DRY_RUN', subject: aiResult.subject })
        continue
      }

      const unsubToken = crypto.randomBytes(16).toString('hex')
      const html = wrapEmailHtml(aiResult.body, lead.email, unsubToken)

      const emailResult = await sendEmail({
        to: lead.email,
        subject: aiResult.subject || 'UK Vehicle Sourcing — UK Car Source',
        html,
      })

      // Log it
      await db.outreachLog.create({
        data: {
          leadId: lead.id,
          channel: 'EMAIL',
          subject: aiResult.subject,
          body: aiResult.body,
          status: 'SENT',
          sentAt: new Date(),
          messageId: emailResult?.id,
        },
      })

      // Update lead stage and last contact
      await db.lead.update({
        where: { id: lead.id },
        data: {
          lastContactedAt: new Date(),
          stage: (lead.stage === 'NEW' || lead.stage === 'ENRICHED') ? 'CONTACTED' : lead.stage,
        },
      })

      await db.activity.create({
        data: { leadId: lead.id, type: 'EMAIL_SENT', note: `Bulk send: "${aiResult.subject}"` },
      })

      results.push({ id: lead.id, company: lead.companyName, email: lead.email, status: 'SENT', subject: aiResult.subject })

      // Delay between sends to protect sending reputation
      await sleep(DELAY_MS)

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      results.push({ id: lead.id, company: lead.companyName, email: lead.email as string, status: `FAILED: ${msg}` })
    }
  }

  const sent = results.filter((r) => r.status === 'SENT').length
  const failed = results.filter((r) => r.status.startsWith('FAILED')).length

  return NextResponse.json({ sent, failed, dryRun, results })
}
