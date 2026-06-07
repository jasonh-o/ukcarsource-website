import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')

  if (!email) {
    return new NextResponse('<h2>Invalid unsubscribe link.</h2>', { headers: { 'Content-Type': 'text/html' } })
  }

  await db.lead.updateMany({
    where: { email },
    data: { optedOut: true, optedOutAt: new Date() },
  })

  return new NextResponse(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:500px;margin:60px auto;text-align:center;">
    <h2>Unsubscribed</h2>
    <p>You have been removed from all UK Car Source marketing communications.</p>
    <p style="color:#999;font-size:13px;">Email: ${email}</p>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}
