import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = `${process.env.RESEND_FROM_NAME || 'UK Car Source'} <${process.env.RESEND_FROM_EMAIL || 'deals@ukcarsource.com'}>`

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
  headers?: Record<string, string>
}

export async function sendEmail(opts: SendEmailOptions) {
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    reply_to: opts.replyTo,
    headers: opts.headers,
  })

  if (error) throw new Error(`Email send failed: ${error.message}`)
  return data
}

export function wrapEmailHtml(body: string, recipientEmail: string, unsubToken: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const unsubUrl = `${appUrl}/unsubscribe?token=${unsubToken}&email=${encodeURIComponent(recipientEmail)}`

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="border-bottom: 2px solid #e07b20; padding-bottom: 16px; margin-bottom: 24px;">
    <strong style="font-size: 16px; color: #111;">UK Car Source</strong>
    <span style="color: #888; font-size: 12px; margin-left: 8px;">Premium Vehicle Export Specialists</span>
  </div>
  ${body.replace(/\n/g, '<br>')}
  <div style="border-top: 1px solid #eee; margin-top: 32px; padding-top: 16px; font-size: 11px; color: #999;">
    <p>UK Car Source | ukcarsource.com | +44 (0) 1234 567890</p>
    <p>This message was sent to ${recipientEmail} as a legitimate business communication under GDPR Article 6(1)(f) — legitimate interests.</p>
    <p><a href="${unsubUrl}" style="color: #999;">Unsubscribe from future communications</a></p>
  </div>
</body>
</html>`
}
