import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const seedLeads = [
  {
    companyName: 'Gulf Elite Motors',
    contactName: 'Ahmed Al-Rashid',
    country: 'UAE',
    city: 'Dubai',
    email: 'ahmed@gulfelitemotors.ae',
    whatsapp: '+971501234567',
    website: 'https://gulfelitemotors.ae',
    vehicleSpecialty: ['Rolls-Royce', 'Bentley', 'Prestige Saloon'],
    stage: 'NEW' as const,
    score: 88,
    source: 'LINKEDIN' as const,
    notes: 'Large showroom on Sheikh Zayed Road. Imports 20+ prestige units monthly.',
  },
  {
    companyName: 'Tokyo Auto Imports',
    contactName: 'Kenji Tanaka',
    country: 'Japan',
    city: 'Tokyo',
    email: 'kenji@tokyoautoimports.jp',
    vehicleSpecialty: ['Prestige RHD', 'Performance / Sports', 'Classic / Collector'],
    stage: 'ENRICHED' as const,
    score: 76,
    source: 'DIRECTORY' as const,
    notes: 'Specialist in UK sourced RHD prestige. Strong demand for manual performance cars.',
  },
  {
    companyName: 'Pacific Prestige NZ',
    contactName: 'James Wilson',
    country: 'New Zealand',
    city: 'Auckland',
    email: 'james@pacificprestige.co.nz',
    whatsapp: '+6421987654',
    vehicleSpecialty: ['RHD Specialist', 'Luxury SUV', 'Prestige Saloon'],
    stage: 'CONTACTED' as const,
    score: 72,
    source: 'GOOGLE_MAPS' as const,
    lastContactedAt: new Date(Date.now() - 5 * 86400000),
  },
  {
    companyName: 'Nairobi Motor Group',
    contactName: 'David Kamau',
    country: 'Kenya',
    city: 'Nairobi',
    whatsapp: '+254712345678',
    vehicleSpecialty: ['Luxury SUV', 'American Muscle / Truck'],
    stage: 'REPLIED' as const,
    score: 65,
    source: 'FACEBOOK' as const,
    notes: 'Looking for Land Rovers and Toyota Land Cruisers primarily. Also interested in American trucks.',
    lastContactedAt: new Date(Date.now() - 2 * 86400000),
  },
  {
    companyName: 'Caribbean Auto Traders',
    contactName: 'Marcus Thompson',
    country: 'Jamaica',
    city: 'Kingston',
    email: 'marcus@caribbeanauto.jm',
    vehicleSpecialty: ['RHD Specialist', 'Performance / Sports'],
    stage: 'QUALIFIED' as const,
    score: 70,
    source: 'REFERRAL' as const,
    notes: 'Regular importer. Looking for 3-5 units per month. Prefers low mileage Japanese-spec equivalents.',
    lastContactedAt: new Date(Date.now() - 1 * 86400000),
  },
  {
    companyName: 'Singapore Premium Cars',
    contactName: 'Wei Chen',
    country: 'Singapore',
    city: 'Singapore',
    email: 'wei@singaporepremium.sg',
    website: 'https://singaporepremium.sg',
    vehicleSpecialty: ['Prestige Saloon', 'Luxury SUV', 'Electric / Hybrid'],
    stage: 'ACTIVE_BUYER' as const,
    score: 92,
    source: 'WEBSITE' as const,
    notes: 'Has COE expertise. Repeat buyer — completed 2 transactions. Focused on hybrid/EV prestige for 2025.',
    lastContactedAt: new Date(Date.now() - 3 * 86400000),
  },
  {
    companyName: 'Bangkok Luxury Autos',
    contactName: 'Somchai Pradit',
    country: 'Thailand',
    city: 'Bangkok',
    vehicleSpecialty: ['Rolls-Royce', 'Bentley', 'Luxury SUV'],
    stage: 'NEW' as const,
    score: 82,
    source: 'LINKEDIN' as const,
    notes: 'Importer for Bangkok HNW market. Rolls-Royce and Bentley are primary interest.',
  },
  {
    companyName: 'Limassol Elite Motors',
    country: 'Cyprus',
    city: 'Limassol',
    email: 'info@limassol-elite.cy',
    vehicleSpecialty: ['LHD Specialist', 'Prestige Saloon'],
    stage: 'NEW' as const,
    score: 58,
    source: 'MANUAL' as const,
  },
]

const seedTemplates = [
  {
    name: 'Initial Email — Prestige Dealer',
    channel: 'EMAIL' as const,
    subject: 'Premium UK Vehicle Sourcing — UK Car Source',
    body: `Dear {{contactName}},

I hope this message finds you well. I'm reaching out from UK Car Source, specialists in prestige and luxury vehicle sourcing and export from the UK.

With over 15 years in the industry, we work with dealers across {{country}} supplying carefully selected premium vehicles — from Rolls-Royce and Bentley to performance, prestige SUVs and specialist models.

We have direct access to the UK's main dealer network, franchise groups and specialist auction stock, which means we can source specific vehicles quickly and reliably.

I'd welcome the chance to discuss how we could support your sourcing requirements. Would a brief call or WhatsApp conversation work for you this week?

Warm regards,
UK Car Source Team`,
    variables: ['contactName', 'country'],
    tags: ['initial', 'prestige', 'email'],
  },
  {
    name: 'WhatsApp — First Contact',
    channel: 'WHATSAPP' as const,
    body: `Hi {{contactName}}, I'm from UK Car Source — we specialise in exporting prestige vehicles from the UK to {{country}}. We work with dealers on Rolls-Royce, luxury SUVs, performance and specialist vehicles. Would you have a moment to discuss your current sourcing needs? 🇬🇧`,
    variables: ['contactName', 'country'],
    tags: ['initial', 'whatsapp'],
  },
  {
    name: 'Follow-up Email — 7 Days',
    channel: 'EMAIL' as const,
    subject: 'Following up — UK Vehicle Sourcing',
    body: `Hi {{contactName}},

Just following up on my message from last week about UK vehicle sourcing.

We've recently had some excellent stock come through — including prestige SUVs, performance saloons and a few specialist models that might interest your buyers.

If you'd like to see what we currently have available or discuss a specific sourcing request, I'd be happy to connect.

Best regards,
UK Car Source`,
    variables: ['contactName'],
    tags: ['follow-up', 'email'],
  },
  {
    name: 'LinkedIn — Connection Request Note',
    channel: 'LINKEDIN' as const,
    body: `Hi {{contactName}}, I noticed your dealership specialises in {{specialty}} — we export premium vehicles from the UK and work with dealers in {{country}}. Would be great to connect and explore whether we could support your sourcing.`,
    variables: ['contactName', 'specialty', 'country'],
    tags: ['linkedin', 'initial'],
  },
]

async function main() {
  console.log('Seeding database...')

  for (const lead of seedLeads) {
    await db.lead.create({ data: lead })
  }

  for (const template of seedTemplates) {
    await db.template.create({ data: template })
  }

  console.log(`Seeded ${seedLeads.length} leads and ${seedTemplates.length} templates`)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
