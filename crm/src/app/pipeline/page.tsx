import { db, parseJsonArray } from '@/lib/db'
import { Sidebar } from '@/components/layout/Sidebar'
import { STAGE_LABELS, STAGE_COLORS } from '@/types'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const PIPELINE_STAGES = ['NEW', 'ENRICHED', 'CONTACTED', 'REPLIED', 'QUALIFIED', 'NEGOTIATING', 'ACTIVE_BUYER'] as const

export default async function PipelinePage() {
  const rawLeads = await db.lead.findMany({
    where: { optedOut: false, stage: { in: [...PIPELINE_STAGES] } },
    orderBy: { score: 'desc' },
    select: { id: true, companyName: true, country: true, stage: true, score: true, vehicleSpecialty: true, lastContactedAt: true },
  })
  const leads = rawLeads.map(l => ({ ...l, vehicleSpecialty: parseJsonArray(l.vehicleSpecialty) }))

  const byStage = PIPELINE_STAGES.reduce<Record<string, typeof leads>>((acc, s) => {
    acc[s] = leads.filter((l) => l.stage === s)
    return acc
  }, {} as Record<string, typeof leads>)

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-6 overflow-x-auto">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-white">Pipeline</h1>
          <p className="text-sm text-neutral-500">{leads.length} active leads across {PIPELINE_STAGES.length} stages</p>
        </div>

        <div className="flex gap-3 min-w-max">
          {PIPELINE_STAGES.map((stage) => {
            const stageLeads = byStage[stage] || []
            return (
              <div key={stage} className="w-64 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-full', STAGE_COLORS[stage])} />
                    <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                      {STAGE_LABELS[stage]}
                    </span>
                  </div>
                  <span className="badge bg-neutral-800 text-neutral-500 text-[10px]">{stageLeads.length}</span>
                </div>

                <div className="space-y-2">
                  {stageLeads.map((lead) => (
                    <Link
                      key={lead.id}
                      href={`/leads/${lead.id}`}
                      className="block card p-3 hover:border-orange-500/40 transition-colors"
                    >
                      <p className="text-sm font-medium text-neutral-100 truncate">{lead.companyName}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">{lead.country}</p>
                      {lead.vehicleSpecialty.length > 0 && (
                        <p className="text-[10px] text-orange-400/70 mt-1 truncate">
                          {lead.vehicleSpecialty.slice(0, 2).join(' · ')}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className={cn('text-xs font-bold', lead.score >= 70 ? 'text-red-400' : lead.score >= 50 ? 'text-orange-400' : 'text-neutral-500')}>
                          {lead.score}
                        </span>
                        {lead.lastContactedAt && (
                          <span className="text-[10px] text-neutral-600">
                            {Math.floor((Date.now() - new Date(lead.lastContactedAt).getTime()) / 86400000)}d ago
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}

                  {stageLeads.length === 0 && (
                    <div className="card p-4 border-dashed">
                      <p className="text-[11px] text-neutral-700 text-center">No leads</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
