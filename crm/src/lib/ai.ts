import Anthropic from '@anthropic-ai/sdk'

// Instantiate lazily so env vars are always loaded at call time
function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set in .env file')
  return new Anthropic({ apiKey })
}

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
  const systemPrompt = `You are writing a COLD outreach message on behalf of UK Car Source — a premium UK vehicle sourcing and export company with 15+ years of experience.

CRITICAL: This is the FIRST time we are EVER contacting this person. We have NO prior relationship. We have NEVER done business together. Do NOT imply we know them, have worked with them, have spoken before, or have any existing relationship. Do NOT say things like "as we've discussed", "following our conversation", "as you know", or anything that suggests prior contact.

You are a stranger reaching out professionally for the first time to introduce UK Car Source as a potential sourcing partner.

Where UK Car Source sources vehicles from:
- RHD vehicles: sourced from the UK and Australia
- LHD vehicles: sourced from Europe (Germany, Belgium, France, Netherlands etc.) and the USA
- LHD Rolls-Royce specifically: sourced from the UK (UK-spec LHD factory orders exist) and Europe
- American vehicles (F-150, RAM, Dodge, Corvette, Mustang): sourced from USA and UK grey imports

What UK Car Source can supply — match these to what the dealer buys:
- Rolls-Royce (Ghost, Cullinan, Phantom, Spectre, Wraith) — RHD from UK, LHD from UK and Europe
- Bentley (Bentayga, Continental, Flying Spur, Mulsanne) — RHD from UK, LHD from UK and Europe
- Range Rover / Land Rover (Defender, Discovery, Sport, Vogue, SVR) — RHD from UK, LHD from Europe
- Porsche (Cayenne, Panamera, Taycan, 911, Macan) — RHD from UK, LHD from Europe
- Mercedes-Benz (G-Class, GLE, S-Class, AMG variants) — RHD from UK, LHD from Europe
- American vehicles (Ford F-150, RAM 1500/2500, Dodge Challenger/Charger, Corvette, Mustang GT500) — sourced from USA and UK
- Performance and sports cars (Aston Martin, McLaren, Ferrari, Lamborghini) — RHD and LHD
- Classic and collector vehicles — UK and Europe
- DAF XF tractor units and commercial trucks — RHD from UK
- Land Rover Defender Commercial — RHD from UK
- Electric and hybrid prestige (Rolls-Royce Spectre, Bentley Bentayga Hybrid, Range Rover PHEV) — RHD from UK, LHD from Europe
- Hard-to-find, factory bespoke and rare specification vehicles — worldwide sourcing

IMPORTANT sourcing rules for the message:
- If the dealer is in an LHD market (EU, Gulf, Central Asia) — emphasise LHD sourcing from Europe/USA
- If the dealer is in an RHD market (Japan, Australia, NZ, Kenya, Caribbean, SE Asia) — emphasise RHD from UK
- Never say we source LHD from countries we don't (e.g. don't say "UK LHD" for non-RR unless it's correct)

Writing rules:
- This is cold outreach — introduce yourself as if they have never heard of us
- MATCH the message specifically to what THEY buy — if they buy Range Rovers, talk about Range Rovers. If they buy American trucks, talk about F-150 and RAM. If they buy Rolls-Royce, focus on RR.
- Be professional, confident and warm — not salesy or pushy
- Reference local market context (RHD in Japan/NZ/Kenya/Australia, LHD in EU/Gulf, COE in Singapore)
- Keep email under 160 words — short, punchy, easy to read
- WhatsApp under 80 words
- LinkedIn under 100 words
- For EMAIL: include one natural sentence asking them to share their WhatsApp number for quicker communication and regular stock alerts — make it feel convenient not pushy. e.g. "If it's easier, drop me your WhatsApp and I'll send you regular stock alerts directly."
- End with ONE simple low-pressure call to action
- Never mention competitor names
- GDPR compliant — legitimate business interest, cold B2B contact
- Every email MUST end with this exact sign-off (do not change or skip it):

Kind regards,
Jay
UK Car Source

📧 sales@ukcarsource.com
📱 WhatsApp: +44 7831 921254
🌐 www.ukcarsource.com`

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

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  // Replace any [Name] placeholders with Jay
  const text = raw.replace(/\[Name\]/g, 'Jay').replace(/\[Your Name\]/g, 'Jay').replace(/\[Your name\]/g, 'Jay')

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
  } catch {
    // fallback: treat entire text as body
  }

  return { body: text }
}

export async function scoreLead(lead: LeadContext): Promise<{ score: number; reasoning: string }> {
  const response = await getClient().messages.create({
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
  const response = await getClient().messages.create({
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
