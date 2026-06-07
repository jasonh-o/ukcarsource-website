import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { Sidebar } from '@/components/layout/Sidebar'
import { LeadDetail } from '@/components/crm/LeadDetail'

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const lead = await db.lead.findUnique({
    where: { id: params.id },
    include: {
      activities: { orderBy: { createdAt: 'desc' }, take: 50 },
      outreachLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      enquiries: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!lead) notFound()

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <LeadDetail lead={lead as Parameters<typeof LeadDetail>[0]['lead']} />
      </div>
    </div>
  )
}
