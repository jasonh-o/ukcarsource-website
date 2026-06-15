import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey || !apiKey.startsWith('sk-ant-')) {
    return NextResponse.json(
      { ok: false, error: 'ANTHROPIC_API_KEY is missing or malformed in .env.local' },
      { status: 400 }
    )
  }

  try {
    const client = new Anthropic({ apiKey })
    await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'ping' }],
    })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message.includes('401') || message.includes('authentication') ? 401 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
