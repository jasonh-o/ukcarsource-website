import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface LeadContext {
  companyName: string
  contactName?: string | null
  country: string
  city?: string | null
  vehicleSpecialty: string[]
  website?: string | null
  notes?: string | null
  stage: string
}

interface OutreachOptions {
  channel: 'email' | 'whatsapp' | 'linkedin'
  tone?: 'formal' | 'friendly' | 'direct'
  angle?: string
}

export async function generateOutreach(
  lead: LeadContext,
  options: OutreachOptions
): Promise<{ subject?: string; body: string }> {
  const systemPrompt = `You are a senior B2B automotive export specialist at UK Car Source, a premium UK vehicle sourcing and export company with 15+ years of experience. You export prestige, luxury, performance, Rolls-Royce, American, RHD and specialist vehicles to 35+ countries worldwide.

Your goal is to build genuine, long-term dealer relationships — not spam. Write as a knowledgeable industry professional who understands the buyer's market deeply.

Key positioning:
- UK's most trusted vehicle sourcing and export partner
- Access to full UK dealer network, auction stock, and prestige specialists
- Complete export documentation, shipping and logistics support
- RHD/LHD specialists — Japan, NZ, Singapore, Australia, Kenya, Caribbean and more
- Rolls-Royce and ultra-prestige sourcing capability
- Hard-to-find and factory-spec vehicles

Rules:
- Never mention competitor names
- Always personalise to their country and vehicle specialty
- Acknowledge local market context (import regulations, COE in Singapore, etc.)
- Focus on partnership and sourcing value — not just selling
- Keep email under 180 words, WhatsApp under 100 words, LinkedIn under 120 words
- End with a clear, low-pressure call to action
- GDPR compliant — legitimate business interest approach`

  const userPrompt = `Write a ${options.channel} outreach message for:

Company: ${lead.companyName}
${lead.contactName ? `Contact: ${lead.contactName}` : ''}
Country: ${lead.country}
${lead.city ? `City: ${lead.city}` : ''}
Vehicle Specialty: ${lead.vehicleSpecialty.join(', ') || 'General dealer'}
${lead.website ? `Website: ${lead.website}` : ''}
${lead.notes ? `Notes: ${lead.notes}` : ''}

Tone: ${options.tone || 'professional and warm'}
${options.angle ? `Angle: ${options.angle}` : ''}

${options.channel === 'email' ? 'Return JSON: { "subject": "...", "body": "..." }' : 'Return JSON: { "body": "..." }'}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
  } catch {
    // fallback: treat entire text as body
  }

  return { body: text }
}

export async function scoreLead(lead: LeadContext): Promise<{ score: number; reasoning: string }> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: `You are a B2B automotive export lead scoring expert for UK Car Source. Score dealer/importer leads 0-100 based on: market potential, vehicle specialty alignment, country priority, company size indicators, and buying intent signals.

Priority markets (higher score): UAE, Japan, Singapore, New Zealand, Australia, Thailand, Cyprus, Malta, Kenya, Nigeria, Jamaica, Hong Kong, Malaysia.
Priority vehicles (higher score): Rolls-Royce, Bentley, Prestige SUV, Performance, American trucks, RHD specialist.`,
    messages: [
      {
        role: 'user',
        content: `Score this lead. Return JSON: { "score": 0-100, "reasoning": "one sentence" }

Company: ${lead.companyName}
Country: ${lead.country}
City: ${lead.city || 'unknown'}
Vehicle Specialty: ${lead.vehicleSpecialty.join(', ') || 'general'}
Stage: ${lead.stage}
${lead.notes ? `Notes: ${lead.notes}` : ''}`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
  } catch {
    // ignore
  }
  return { score: 50, reasoning: 'Default score — AI scoring unavailable' }
}

export async function suggestFollowUp(
  lead: LeadContext,
  lastMessage: string,
  daysSinceContact: number
): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `UK Car Source follow-up suggestion for a ${lead.country} dealer (${lead.vehicleSpecialty.join(', ')}).
Last message sent ${daysSinceContact} days ago: "${lastMessage.substring(0, 200)}"
Current stage: ${lead.stage}

Write a short, natural follow-up (under 80 words). Return just the message body, no JSON.`,
      },
    ],
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}
