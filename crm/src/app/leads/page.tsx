import { db } from '@/lib/db'
import { Sidebar } from '@/components/layout/Sidebar'
import { LeadsTable } from '@/components/crm/LeadsTable'
import { LeadFilters } from '@/components/crm/LeadFilters'
import { AddLeadButton } from '@/components/crm/AddLeadButton'
import { PRIORITY_MARKETS } from '@/types'

interface PageProps {
  searchParams: { stage?: string; country?: string; search?: string; page?: string }
}

export default async function LeadsPage({ searchParams }: PageProps) {
  const page = parseInt(searchParams.page || '1')
  const limit = 50
  const where: Record<string, unknown> = { optedOut: false }

  if (searchParams.stage) where.stage = searchParams.stage
  if (searchParams.country) where.country = searchParams.country
  if (searchParams.search) {
    where.OR = [
      { companyName: { contains: searchParams.search, mode: 'insensitive' } },
      { contactName: { contains: searchParams.search, mode: 'insensitive' } },
      { email: { contains: searchParams.search, mode: 'insensitive' } },
    ]
  }

  const [leads, total] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { activities: true, outreachLogs: true } } },
    }),
    db.lead.count({ where }),
  ])

  const countries = await db.lead.groupBy({
    by: ['country'],
    where: { optedOut: false },
    _count: true,
    orderBy: { _count: { country: 'desc' } },
  })

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Leads</h1>
            <p className="text-sm text-neutral-500">{total} dealers & importers</p>
          </div>
          <AddLeadButton />
        </div>

        <LeadFilters countries={countries.map((c) => c.country)} />
        <LeadsTable leads={leads} total={total} page={page} limit={limit} />
      </div>
    </div>
  )
}
